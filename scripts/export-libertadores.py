"""
Exporta a Copa Libertadores (2012 em diante) para os JSON do site:
app/frontend/public/data/editions/libertadores-<ano>.json

    python scripts/export-libertadores.py          (todas as edições disponíveis)
    python scripts/export-libertadores.py 2025     (uma edição)

Fonte: openfootball/south-america (domínio público), arquivos copa-libertadores/<ano>_copal.txt.
Só traz jogos e placares (sem estádios, árbitros, elencos nem gols por jogador).
Os arquivos baixados ficam em data/openfootball/ e são reaproveitados se não houver internet.
Os grupos das edições recentes não trazem letra no arquivo: as letras A, B, C... seguem a ordem
em que cada grupo aparece na 1ª rodada.
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

COMPETICAO = "libertadores"
SAIDA_DIR = ifc_db.pasta_saida_dados() / "editions"
CACHE = AQUI.parent / "data" / "openfootball"
BASE = "https://raw.githubusercontent.com/openfootball/south-america/master/copa-libertadores"
ANOS = list(range(2012, 2027))

MESES = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
LINHA_JOGO = re.compile(r"^\s+(?:(\d{2}:\d{2})\s+)?(.+?) \(([A-Za-z]{3})\)\s+v\s+(.+?) \(([A-Za-z]{3})\)(?:\s+(\S.*))?$")
LINHA_DATA = re.compile(r"^\s{2}(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) (\d{1,2})(?: (\d{4}))?\s*$")
PLACAR = re.compile(r"^(?:(\d+)-(\d+) pen\.\s*)?(?:(\d+)-(\d+) a\.e\.t\.\s*)?(?:\((\d+)-(\d+)(?:, \d+-\d+)?\)\s*)?$|^(\d+)-(\d+)(?:\s+\[awarded\])?\s*(?:\((\d+)-(\d+)(?:, \d+-\d+)?\))?$")


def baixa(ano: int) -> str | None:
    CACHE.mkdir(parents=True, exist_ok=True)
    arq = CACHE / f"{ano}_copal.txt"
    try:
        req = urllib.request.Request(f"{BASE}/{ano}_copal.txt", headers={"User-Agent": "iFutebolClube"})
        with urllib.request.urlopen(req, timeout=40) as r:
            arq.write_bytes(r.read())
    except Exception as e:  # noqa: BLE001
        if not arq.exists():
            print(f"{ano}: sem arquivo ({e})", file=sys.stderr)
            return None
        print(f"{ano}: sem internet, usando a cópia em {arq}", file=sys.stderr)
    return arq.read_text(encoding="utf-8")


def etapa(titulo: str) -> tuple[str, int | str | None]:
    """(nome em português, grupo se vier no título: número ou letra)."""
    t = titulo.strip()
    m = re.match(r"Gruppe (\w)\b", t)
    if m:
        g = m.group(1)
        return "Fase de Grupos", int(g) if g.isdigit() else g.upper()
    if t.startswith("Group"):
        return "Fase de Grupos", None
    if t.startswith("Qualifying") or re.match(r"Round [123]$", t):
        n = re.search(r"Round (\d)", t)
        return f"Fase preliminar {n.group(1)}" if n else "Fase preliminar", None
    if "Round of 16" in t:
        return "Oitavas de final", None
    if "Quarterfinals" in t:
        return "Quartas de final", None
    if "Semifinals" in t:
        return "Semifinal", None
    if t.endswith("Final") and "Semi" not in t and "Quarter" not in t:
        return "Final", None
    if t.startswith("Playoffs"):
        return "Playoffs", None
    return t, None


def slug(txt: str) -> str:
    s = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]+", "", s)[:16]


SIGLAS = {"CA", "CR", "SC", "EC", "SE", "CD", "CS", "CF", "CSD", "CDC", "CAR", "CSCYD", "FBC", "FC", "AD", "SD", "CP", "CC", "AA", "FR", "SP", "RJ", "PR", "MG", "RS", "BA"}


def limpa_nome(nome: str) -> str:
    """Tira siglas de tipo de clube do começo e do fim ("CR Flamengo" -> "Flamengo", "Botafogo FR" -> "Botafogo")."""
    p = nome.split()
    while len(p) > 1 and p[0].upper() in SIGLAS:
        p = p[1:]
    while len(p) > 1 and p[-1].upper() in SIGLAS:
        p = p[:-1]
    return " ".join(p)


def interpreta(texto: str) -> list[dict]:
    jogos, titulo, grupo_num = [], "", None
    ano = None
    mes_ant, data, hora = 0, None, "00:00"
    for linha in texto.splitlines():
        if linha.startswith("▪"):
            titulo = linha[1:].strip()
            _, grupo_num = etapa(titulo)
            data, hora = None, "00:00"
            continue
        m = LINHA_DATA.match(linha)
        if m:
            mes, dia = MESES[m.group(1)], int(m.group(2))
            if m.group(3):
                ano = int(m.group(3))
            elif ano is not None and mes < mes_ant:
                ano += 1
            mes_ant = mes
            data = f"{ano:04d}-{mes:02d}-{dia:02d}"
            continue
        m = LINHA_JOGO.match(linha)
        if not m or not titulo or data is None:
            continue
        h, ta, pa, tb, pb, resto = m.groups()
        if h:
            hora = h
        sa = sb = penA = penB = None
        if resto:
            r = PLACAR.match(resto.strip())
            if not r:
                continue
            g = r.groups()
            if g[6] is not None:  # N-N [awarded] (HT)
                sa, sb = int(g[6]), int(g[7])
            else:
                if g[0] is not None:
                    penA, penB = int(g[0]), int(g[1])
                if g[2] is not None:
                    sa, sb = int(g[2]), int(g[3])
                elif g[4] is not None:
                    sa, sb = int(g[4]), int(g[5])
                if sa is None:
                    continue
        else:
            continue  # jogo ainda sem resultado: fica fora
        nome, _ = etapa(titulo)
        jogos.append({"stage": nome, "titulo": titulo, "grupo_num": grupo_num, "date": data, "time": hora,
                      "a": (ta.strip(), pa.upper()), "b": (tb.strip(), pb.upper()),
                      "sa": sa, "sb": sb, "pa": penA, "pb": penB})
    return jogos


def monta(ano: int, jogos: list[dict]) -> dict:
    # clubes
    codigo: dict[tuple[str, str], str] = {}
    for j in jogos:
        for lado in ("a", "b"):
            nome, pais = j[lado]
            codigo.setdefault((nome, pais), f"{pais}_{slug(nome)}")
    # grupos: componentes conexos dos jogos de grupo; a letra vem do arquivo ("Gruppe X") quando houver,
    # senão segue a ordem de aparição entre as letras que sobraram
    pai: dict[str, str] = {}

    def raiz(x):
        while pai.setdefault(x, x) != x:
            pai[x] = pai[pai[x]]
            x = pai[x]
        return x

    ordem: list[str] = []
    rotulo: dict[str, str] = {}
    for j in jogos:
        if j["stage"] != "Fase de Grupos":
            continue
        a, b = codigo[j["a"]], codigo[j["b"]]
        for c in (a, b):
            if c not in ordem:
                ordem.append(c)
        pai[raiz(a)] = raiz(b)
    for j in jogos:
        if j["stage"] == "Fase de Grupos" and j["grupo_num"]:
            gn = j["grupo_num"]
            rotulo[raiz(codigo[j["a"]])] = chr(64 + gn) if isinstance(gn, int) else gn
    usadas = set(rotulo.values())
    livres = (chr(65 + n) for n in range(26) if chr(65 + n) not in usadas)
    grupo_de: dict[str, str] = {}
    for c in ordem:
        r = raiz(c)
        if r not in rotulo:
            rotulo[r] = next(livres)
        grupo_de[c] = rotulo[r]

    # ida/volta nas fases eliminatórias
    jogos.sort(key=lambda j: (j["date"], j["time"]))
    por_par: dict[tuple, list[dict]] = {}
    for j in jogos:
        if j["stage"] != "Fase de Grupos":
            par = (j["stage"], frozenset((codigo[j["a"]], codigo[j["b"]])))
            por_par.setdefault(par, []).append(j)
    for lista in por_par.values():
        if len(lista) == 2:
            lista[0]["stage"] += " (ida)"
            lista[1]["stage"] += " (volta)"

    matches = []
    for i, j in enumerate(jogos, 1):
        a, b = codigo[j["a"]], codigo[j["b"]]
        matches.append({
            "id": i, "date": j["date"], "time": j["time"], "teamA": a, "teamB": b,
            "scoreA": j["sa"], "scoreB": j["sb"],
            "group": grupo_de.get(a, "") if j["stage"] == "Fase de Grupos" else "",
            "stadium": "", "city": "", "stage": j["stage"],
            "penaltiesA": j["pa"], "penaltiesB": j["pb"],
        })
    times = {}
    for (nome, pais), c in codigo.items():
        times[c] = {"code": c, "name": limpa_nome(nome), "group": grupo_de.get(c, "")}
    # classificação dos grupos
    tab: dict[str, dict[str, dict]] = {}
    for m in matches:
        if not m["group"]:
            continue
        for c, gp, gc in ((m["teamA"], m["scoreA"], m["scoreB"]), (m["teamB"], m["scoreB"], m["scoreA"])):
            s = tab.setdefault(m["group"], {}).setdefault(c, dict(code=c, played=0, won=0, drawn=0, lost=0, goalsFor=0, goalsAgainst=0, goalDifference=0, points=0))
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
    grupos = [{"name": g, "standings": sorted(t.values(), key=lambda s: (-s["points"], -s["goalDifference"], -s["goalsFor"], s["code"]))}
              for g, t in sorted(tab.items())]
    return {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "teams": sorted(times.values(), key=lambda t: (t["group"] or "~", t["name"])),
            "groups": grupos, "matches": matches}


def exporta(ano: int) -> bool:
    texto = baixa(ano)
    if texto is None:
        return False
    jogos = interpreta(texto)
    if not jogos:
        print(f"{ano}: nenhum jogo com resultado, ignorada.", file=sys.stderr)
        return False
    dados = monta(ano, jogos)
    SAIDA_DIR.mkdir(parents=True, exist_ok=True)
    destino = SAIDA_DIR / f"{COMPETICAO}-{ano}.json"
    tmp = destino.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(destino)
    print(f"{ano}: {len(dados['teams'])} clubes, {len(dados['groups'])} grupos, {len(dados['matches'])} jogos")
    return True


def main() -> int:
    anos = [int(a) for a in sys.argv[1:]] or ANOS
    feitas = [a for a in anos if exporta(a)]
    print("Edições gravadas: " + ", ".join(str(a) for a in feitas))
    return 0 if feitas else 1


if __name__ == "__main__":
    raise SystemExit(main())
