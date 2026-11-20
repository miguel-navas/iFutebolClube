"""
Exporta o Campeonato Brasileiro Série A para os JSON do site:
app/frontend/public/data/editions/brasileirao-<ano>.json

    python scripts/export-brasileirao.py          (2026)
    python scripts/export-brasileirao.py 2026

Fonte: openfootball/south-america (domínio público), brazil/<ano>_br1.txt.
Traz a tabela completa (jogos já disputados e os que faltam), sem estádios, árbitros nem gols por jogador.
O arquivo baixado fica em data/openfootball/ e é reaproveitado se não houver internet.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402

COMPETICAO = "brasileirao"
SAIDA_DIR = ifc_db.pasta_saida_dados() / "editions"
CACHE = AQUI.parent / "data" / "openfootball"
BASE = "https://raw.githubusercontent.com/openfootball/south-america/master/brazil"
ANOS = [2026]

MESES = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
LINHA_DATA = re.compile(r"^\s{2}(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) (\d{1,2})(?: (\d{4}))?\s*$")
LINHA_JOGO = re.compile(r"^\s+(?:(\d{2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)(?:\s+(\d+)-(\d+)(?:\s+\(\d+-\d+\))?|\s+\[postponed\])?\s*$")
RODADA = re.compile(r"^▪\s*Matchday (\d+)")

NOMES = {
    "CA Mineiro": "Atlético Mineiro", "SE Palmeiras": "Palmeiras", "Coritiba FBC": "Coritiba",
    "RB Bragantino": "Red Bull Bragantino", "SC Internacional": "Internacional", "CA Paranaense": "Athletico Paranaense",
    "EC Vitória": "Vitória", "Clube do Remo": "Remo", "Fluminense FC": "Fluminense", "Grêmio FBPA": "Grêmio",
    "Chapecoense AF": "Chapecoense", "Santos FC": "Santos", "SC Corinthians Paulista": "Corinthians", "EC Bahia": "Bahia",
    "São Paulo FC": "São Paulo", "CR Flamengo": "Flamengo", "Mirassol FC": "Mirassol", "CR Vasco da Gama": "Vasco da Gama",
    "Botafogo FR": "Botafogo", "Cruzeiro EC": "Cruzeiro",
}


def slug(txt: str) -> str:
    s = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]+", "", s)[:24]


def nome(bruto: str) -> str:
    bruto = bruto.strip()
    return NOMES.get(bruto, bruto)


def codigo(bruto: str) -> str:
    # mesmo padrão dos clubes da Libertadores (BRA_FLAMENGO...), sem bandeira no site
    return f"BRA_{slug(nome(bruto))}"


def baixa(ano: int) -> str | None:
    CACHE.mkdir(parents=True, exist_ok=True)
    arq = CACHE / f"{ano}_br1.txt"
    try:
        req = urllib.request.Request(f"{BASE}/{ano}_br1.txt", headers={"User-Agent": "iFutebolClube"})
        with urllib.request.urlopen(req, timeout=40) as r:
            arq.write_bytes(r.read())
    except Exception as e:  # noqa: BLE001
        if not arq.exists():
            print(f"{ano}: sem arquivo ({e})", file=sys.stderr)
            return None
        print(f"{ano}: sem internet, usando a cópia em {arq}", file=sys.stderr)
    return arq.read_text(encoding="utf-8")


def interpreta(texto: str, ano: int) -> list[dict]:
    jogos: list[dict] = []
    rodada, data, hora, mes_ant = 0, None, "00:00", 0
    for linha in texto.splitlines():
        m = RODADA.match(linha)
        if m:
            rodada, data, hora = int(m.group(1)), None, "00:00"
            continue
        m = LINHA_DATA.match(linha)
        if m:
            mes, dia = MESES[m.group(1)], int(m.group(2))
            if m.group(3):
                ano = int(m.group(3))
            elif mes < mes_ant:
                ano += 1
            mes_ant = mes
            data, hora = f"{ano:04d}-{mes:02d}-{dia:02d}", "00:00"
            continue
        if rodada == 0 or not linha.strip() or linha.lstrip().startswith("#"):
            continue
        m = LINHA_JOGO.match(linha)
        if not m:
            continue
        h, a, b, ga, gb = m.groups()
        if h:
            hora = h
        jogos.append({
            "rodada": rodada, "date": data or "", "time": hora, "a": a, "b": b,
            "sa": int(ga) if ga is not None else None, "sb": int(gb) if gb is not None else None,
        })
    return jogos


def monta(jogos: list[dict]) -> dict:
    # id = posição do jogo no arquivo da fonte (rodada a rodada): não muda quando um jogo é remarcado,
    # então os detalhes salvos por id (matches/<id>.json) continuam apontando para o jogo certo.
    for n, j in enumerate(jogos, 1):
        j["id"] = n
    jogos.sort(key=lambda j: (j["date"] or "9999", j["time"], j["rodada"]))
    matches = []
    for j in jogos:
        matches.append({
            "id": j["id"], "date": j["date"], "time": j["time"], "teamA": codigo(j["a"]), "teamB": codigo(j["b"]),
            "scoreA": j["sa"], "scoreB": j["sb"], "group": "A", "stadium": "", "city": "",
            "stage": f"Rodada {j['rodada']}", "penaltiesA": None, "penaltiesB": None,
        })
    times = {}
    tab: dict[str, dict] = {}
    for j, mt in zip(jogos, matches):
        for bruto, c in ((j["a"], mt["teamA"]), (j["b"], mt["teamB"])):
            times[c] = {"code": c, "name": nome(bruto), "group": "A"}
            tab.setdefault(c, dict(code=c, played=0, won=0, drawn=0, lost=0, goalsFor=0, goalsAgainst=0, goalDifference=0, points=0))
        if j["sa"] is None:
            continue
        for c, gp, gc in ((mt["teamA"], j["sa"], j["sb"]), (mt["teamB"], j["sb"], j["sa"])):
            s = tab[c]
            s["played"] += 1
            s["goalsFor"] += gp
            s["goalsAgainst"] += gc
            s["goalDifference"] += gp - gc
            if gp > gc:
                s["won"] += 1
                s["points"] += 3
            elif gp == gc:
                s["drawn"] += 1
                s["points"] += 1
            else:
                s["lost"] += 1
    classif = sorted(tab.values(), key=lambda s: (-s["points"], -s["won"], -s["goalDifference"], -s["goalsFor"], s["code"]))
    return {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "teams": sorted(times.values(), key=lambda t: t["name"]),
            "groups": [{"name": "A", "standings": classif}], "matches": matches}


def exporta(ano: int) -> bool:
    texto = baixa(ano)
    if texto is None:
        return False
    jogos = interpreta(texto, ano)
    if not jogos:
        print(f"{ano}: nenhum jogo encontrado.", file=sys.stderr)
        return False
    dados = monta(jogos)
    SAIDA_DIR.mkdir(parents=True, exist_ok=True)
    destino = SAIDA_DIR / f"{COMPETICAO}-{ano}.json"
    tmp = destino.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(destino)
    jog = sum(1 for m in dados["matches"] if m["scoreA"] is not None)
    print(f"{ano}: {len(dados['teams'])} clubes, {len(dados['matches'])} jogos ({jog} com placar)")
    return True


def main() -> int:
    anos = [int(a) for a in sys.argv[1:]] or ANOS
    feitas = [a for a in anos if exporta(a)]
    print("Edições gravadas: " + ", ".join(str(a) for a in feitas))
    return 0 if feitas else 1


if __name__ == "__main__":
    raise SystemExit(main())
