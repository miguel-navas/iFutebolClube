"""
Baixa do UOL Placar a página de cada jogo do Brasileirão já disputado (escalações, gols, cartões,
substituições e estatísticas vêm dentro do HTML) e guarda uma cópia compactada em
data/uol-brasileirao/<ano>/<id>.html.gz, onde <id> é o id do jogo em brasileirao-<ano>.json.

    python scripts/baixar-brasileirao-uol.py            (2026, só o que ainda não foi baixado)
    python scripts/baixar-brasileirao-uol.py --refazer  (baixa tudo de novo)
    python scripts/baixar-brasileirao-uol.py 2026 --max 5   (teste com 5 jogos)

Roda no seu PC (o servidor não alcança o UOL). Uma requisição por segundo, uma página por jogo.
Depois de baixar, rode scripts/extrair-brasileirao-uol.py para gerar os detalhes dos jogos.
"""
from __future__ import annotations

import gzip
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402

RAIZ = AQUI.parent
EDITIONS = ifc_db.pasta_saida_dados() / "editions"
BASE = "https://placar.uol.com.br/esporte/futebol/brasileirao"

# nome do clube no site (código BRA_*) -> trecho do endereço no UOL
SLUG = {
    "BRA_ATLETICOMINEIRO": "atletico-mg", "BRA_PALMEIRAS": "palmeiras", "BRA_CORITIBA": "coritiba",
    "BRA_REDBULLBRAGANTINO": "red-bull-bragantino", "BRA_INTERNACIONAL": "internacional",
    "BRA_ATHLETICOPARANAENSE": "athletico-pr", "BRA_VITORIA": "vitoria", "BRA_REMO": "remo",
    "BRA_FLUMINENSE": "fluminense", "BRA_GREMIO": "gremio", "BRA_CHAPECOENSE": "chapecoense",
    "BRA_SANTOS": "santos", "BRA_CORINTHIANS": "corinthians", "BRA_BAHIA": "bahia",
    "BRA_SAOPAULO": "sao-paulo", "BRA_FLAMENGO": "flamengo", "BRA_MIRASSOL": "mirassol",
    "BRA_VASCODAGAMA": "vasco", "BRA_BOTAFOGO": "botafogo", "BRA_CRUZEIRO": "cruzeiro",
}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def pega(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def baixa_jogo(m: dict, ano: int) -> tuple[bytes, str] | None:
    a, b = SLUG.get(m["teamA"]), SLUG.get(m["teamB"])
    if not a or not b:
        print(f"  sem apelido do UOL para {m['teamA']} / {m['teamB']}", flush=True)
        return None
    d0 = date.fromisoformat(m["date"])
    # a data do arquivo da fonte pode diferir 1 dia da do UOL (jogo à noite)
    for delta in (0, -1, 1, -2, 2):
        d = d0 + timedelta(days=delta)
        url = f"{BASE}/{d:%Y/%m/%d}/{a}-x-{b}.htm"
        html = pega(url)
        time.sleep(1)
        if html and b"Reservas" in html:
            return html, url
    return None


def main() -> int:
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    ano = int(args[0]) if args else 2026
    refazer = "--refazer" in sys.argv
    maximo = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 10**9
    dados = json.loads((EDITIONS / f"brasileirao-{ano}.json").read_text(encoding="utf-8"))
    saida = RAIZ / "data" / "uol-brasileirao" / str(ano)
    saida.mkdir(parents=True, exist_ok=True)
    indice_arq = saida / "indice.json"
    indice = json.loads(indice_arq.read_text(encoding="utf-8")) if indice_arq.exists() else {}
    jogados = [m for m in dados["matches"] if m["scoreA"] is not None]
    feitos = falhas = 0
    for m in jogados:
        arq = saida / f"{m['id']}.html.gz"
        if arq.exists() and not refazer:
            continue
        if feitos >= maximo:
            break
        print(f"jogo {m['id']}: {m['teamA']} x {m['teamB']} ({m['date']})", flush=True)
        r = baixa_jogo(m, ano)
        if r is None:
            falhas += 1
            print("  não achei a página", flush=True)
            continue
        html, url = r
        arq.write_bytes(gzip.compress(html))
        indice[str(m["id"])] = url
        feitos += 1
        indice_arq.write_text(json.dumps(indice, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Baixados agora: {feitos}; sem página: {falhas}; total em disco: {len(list(saida.glob('*.html.gz')))} de {len(jogados)} jogos", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
