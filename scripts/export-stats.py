"""
Exporta as estatísticas da Copa do Mundo do banco CopaDoMundo para um arquivo JSON
que o site lê (app/frontend/public/data/stats/copa.json).

Rode na máquina que tem o SQL Server, na pasta do projeto:

    python scripts/export-stats.py

Conexão: usa as mesmas configurações do agente. O script lê, se existirem, nesta ordem:
  1. scripts/.env
  2. C:\\AI\\Agentes\\uefa-nations-league\\.env  (o .env que o agente da Copa já usa)
Variáveis: SQL_SERVER (padrão localhost), SQL_DRIVER, SQL_USER e SQL_PASSWORD (sem SQL_USER usa
autenticação do Windows) e SQL_DATABASE_COPA (padrão CopaDoMundo; o SQL_DATABASE do .env é do
banco da Nations League e NÃO é usado aqui). Variáveis já definidas no ambiente têm prioridade.

Próxima Copa: se existir scripts/next-edition.json, ele entra no arquivo como `nextEdition`
(veja scripts/next-edition.example.json). Sem o arquivo, `nextEdition` fica nulo.

Só edições concluídas entram no arquivo.

Ranking: `ranking` traz o ranking histórico das seleções em Copas (todas as edições concluídas do banco):
títulos, participações, jogos, vitórias, empates, derrotas, gols e pontos (3 por vitória, 1 por empate, para
todas as edições, para poder comparar). A confederação vem da tabela CONFEDERACAO abaixo, pelo código da seleção.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARQUIVOS_ENV = (
    Path(__file__).resolve().parent / ".env",
    RAIZ.parent / "Agentes" / "uefa-nations-league" / ".env",
)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ifc_db  # noqa: E402

SAIDA = ifc_db.pasta_saida_dados() / "stats" / "copa.json"
PROXIMA = Path(__file__).resolve().parent / "next-edition.json"
ARTILHEIROS_POR_EDICAO = 5

SQL_EDICOES = """
SELECT c.Edicao, c.Sede, c.Campeao, c.Vice, c.Partidas, c.Selecoes, c.Gols
FROM dbo.vw_Campeoes c
JOIN dbo.Edicoes e ON e.Edicao = c.Edicao
WHERE e.Concluida = 1
ORDER BY c.Edicao
"""

SQL_PUBLICO = """
SELECT Edicao, SUM(CAST(Publico AS BIGINT)) AS Total, COUNT(*) AS Jogos
FROM dbo.Partidas
WHERE Publico IS NOT NULL AND Publico > 0
GROUP BY Edicao
"""

SQL_MAIOR_VITORIA = """
SELECT Edicao, Mandante, Visitante, GolsMandante, GolsVisitante
FROM (
    SELECT p.Edicao, m.NomePT AS Mandante, v.NomePT AS Visitante,
           p.GolsMandante, p.GolsVisitante,
           ROW_NUMBER() OVER (PARTITION BY p.Edicao
                              ORDER BY ABS(p.GolsMandante - p.GolsVisitante) DESC,
                                       p.GolsMandante + p.GolsVisitante DESC,
                                       p.DataHoraUTC) AS rn
    FROM dbo.Partidas p
    LEFT JOIN dbo.Selecoes m ON m.SelecaoId = p.MandanteId
    LEFT JOIN dbo.Selecoes v ON v.SelecaoId = p.VisitanteId
    WHERE p.GolsMandante IS NOT NULL AND p.GolsVisitante IS NOT NULL
) t
WHERE rn = 1
"""

SQL_ARTILHEIROS = """
SELECT Edicao, Jogador, Selecao, Gols
FROM dbo.vw_ArtilhariaPorEdicao
WHERE Selecao IS NOT NULL
"""


SQL_RANKING_JOGOS = """
SELECT p.Edicao, p.MandanteId, p.VisitanteId, p.GolsMandante, p.GolsVisitante
FROM dbo.Partidas p JOIN dbo.Edicoes e ON e.Edicao = p.Edicao
WHERE e.Concluida = 1 AND p.MandanteId IS NOT NULL AND p.VisitanteId IS NOT NULL
  AND p.GolsMandante IS NOT NULL AND p.GolsVisitante IS NOT NULL
"""

SQL_SELECOES = "SELECT SelecaoId, Codigo, COALESCE(NomePT, Nome), Nome FROM dbo.Selecoes"

CONFEDERACAO = {
    "UEFA": "ENG FRA GER FRG GDR ITA ESP NED POR BEL CRO SUI SWE DEN POL SRB SCG YUG FRY SCO WAL NIR IRL AUT HUN "
            "TCH CZE SVK RUS URS CIS UKR TUR NOR GRE BUL ROU ISR SVN BIH ALB MKD GEO KOS ISL",
    "CONMEBOL": "BRA ARG URU CHI COL ECU PAR PER BOL VEN",
    "CONCACAF": "MEX USA CAN CRC HON JAM PAN SLV HAI CUB TRI CUW ANT GUA",
    "CAF": "CMR SEN NGA GHA MAR TUN ALG EGY CIV RSA ANG TOG ZAI COD CPV GUI MLI BFA GAB ZAM",
    "AFC": "KOR JPN KSA IRN AUS CHN PRK IRQ KUW UAE QAT UZB JOR IDN DEI INH SYR OMA BHR",
    "OFC": "NZL",
}
CONFEDERACAO_POR_CODIGO = {c: conf for conf, codigos in CONFEDERACAO.items() for c in codigos.split()}


def montar_ranking(jogos, selecoes, campeoes):
    """
    Ranking histórico em Copas. Função pura.
    jogos: (edicao, mandante_id, visitante_id, gols_m, gols_v); selecoes: (id, codigo, nome_pt, nome);
    campeoes: nomes dos campeões de cada edição. Devolve (lista ordenada, códigos sem confederação).
    """
    info = {int(r[0]): {"code": r[1], "name": r[2] or r[3] or r[1]} for r in selecoes}
    por_nome = {}
    for r in selecoes:
        for n in (r[2], r[3]):
            if n:
                por_nome.setdefault(n.strip().lower(), int(r[0]))
    t = {}

    def linha(sid):
        return t.setdefault(sid, {"eds": set(), "j": 0, "v": 0, "e": 0, "d": 0, "gp": 0, "gc": 0, "tit": 0})

    for ed, m, v, gm, gv in jogos:
        for sid, gp, gc in ((int(m), int(gm), int(gv)), (int(v), int(gv), int(gm))):
            x = linha(sid)
            x["eds"].add(int(ed))
            x["j"] += 1
            x["gp"] += gp
            x["gc"] += gc
            x["v" if gp > gc else "e" if gp == gc else "d"] += 1
    for nome in campeoes:
        sid = por_nome.get((nome or "").strip().lower())
        if sid is not None and sid in t:
            t[sid]["tit"] += 1

    saida, sem_conf = [], set()
    for sid, x in t.items():
        i = info.get(sid)
        if not i or not i["code"]:
            continue
        conf = CONFEDERACAO_POR_CODIGO.get(i["code"].upper())
        if conf is None:
            sem_conf.add(i["code"])
        saida.append({
            "code": i["code"], "name": i["name"], "confederation": conf or "",
            "titles": x["tit"], "participations": len(x["eds"]), "played": x["j"], "won": x["v"],
            "drawn": x["e"], "lost": x["d"], "goalsFor": x["gp"], "goalsAgainst": x["gc"],
            "points": x["v"] * 3 + x["e"],
        })
    saida.sort(key=lambda r: (-r["points"], -(r["goalsFor"] - r["goalsAgainst"]), -r["goalsFor"], r["name"]))
    return saida, sorted(sem_conf)


def carregar_env() -> None:
    """Lê KEY=valor dos arquivos .env sem sobrescrever o que já está no ambiente."""
    for arq in ARQUIVOS_ENV:
        if not arq.exists():
            continue
        for linha in arq.read_text(encoding="utf-8-sig").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            os.environ.setdefault(chave.strip(), valor.strip().strip('"').strip("'"))


PAISES = {
    "URU": "Uruguai", "ITA": "Itália", "FRA": "França", "BRA": "Brasil", "SUI": "Suíça",
    "SWE": "Suécia", "CHI": "Chile", "ENG": "Inglaterra", "MEX": "México", "GER": "Alemanha",
    "FRG": "Alemanha", "ARG": "Argentina", "ESP": "Espanha", "USA": "Estados Unidos",
    "KOR": "Coreia do Sul", "JPN": "Japão", "RSA": "África do Sul", "QAT": "Catar",
    "RUS": "Rússia", "CAN": "Canadá",
}


def sede(valor: str | None) -> str:
    """A coluna Sede traz códigos de país (ex.: 'BRA' ou 'CAN, MEX, USA'); mostra os nomes em português."""
    if not valor:
        return "—"
    partes = [p.strip() for p in valor.replace("/", ",").split(",") if p.strip()]
    return " · ".join(PAISES.get(p.upper(), p) for p in partes)


def jogador(nome: str | None) -> str:
    """'MUELLER Thomas' -> 'Thomas Mueller': sobrenome em maiúsculas vai para o fim, com inicial maiúscula."""
    if not nome:
        return ""
    partes = nome.split()
    caixa_alta = [p for p in partes if p.isupper()]
    resto = [p for p in partes if not p.isupper()]
    if not caixa_alta:
        return nome
    return " ".join(resto + [p.title() for p in caixa_alta])


def _int(v):
    return None if v is None else int(v)


def montar(edicoes, publico, vitorias, artilheiros, proxima, agora=None, ranking=None) -> dict:
    """Transforma as linhas do banco no formato do site. Função pura, sem acesso a banco."""
    pub = {int(r[0]): (int(r[1]), int(r[2])) for r in publico}
    vit = {
        int(r[0]): {"home": r[1], "away": r[2], "score": f"{int(r[3])}-{int(r[4])}"}
        for r in vitorias
        if r[1] and r[2]
    }
    art: dict[int, list[dict]] = {}
    for ed, nome, selecao, gols in artilheiros:
        art.setdefault(int(ed), []).append({"player": jogador(nome), "team": selecao, "goals": int(gols)})

    saida = []
    for ed, host, campeao, vice, partidas, selecoes, gols in edicoes:
        ano = int(ed)
        total, jogos = pub.get(ano, (None, 0))
        lista = sorted(art.get(ano, []), key=lambda a: (-a["goals"], a["player"]))
        saida.append(
            {
                "year": ano,
                "label": f"Copa {ano}",
                "host": sede(host),
                "champion": campeao,
                "runnerUp": vice,
                "teams": _int(selecoes),
                "matches": _int(partidas),
                "goals": _int(gols),
                "attendanceTotal": total,
                "attendanceAverage": round(total / jogos) if total and jogos else None,
                "topScorers": lista[:ARTILHEIROS_POR_EDICAO],
                "biggestWin": vit.get(ano),
            }
        )
    saida.sort(key=lambda e: e["year"])
    agora = agora or datetime.now(timezone.utc)
    return {
        "generatedAt": agora.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "editions": saida,
        "nextEdition": proxima,
        "ranking": ranking or [],
    }


def ler_proxima() -> dict | None:
    if not PROXIMA.exists():
        return None
    dados = json.loads(PROXIMA.read_text(encoding="utf-8"))
    for campo in ("year", "label", "hosts"):
        if not dados.get(campo):
            raise SystemExit(f"{PROXIMA.name}: campo obrigatório ausente: {campo}")
    dados.setdefault("stadiums", [])
    return dados


# ---------------------------------------------------------------- banco
def _conn_str(bd: str) -> str:
    import pyodbc

    drv = os.getenv("SQL_DRIVER")
    if not drv:
        for d in ("ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server"):
            if d in pyodbc.drivers():
                drv = d
                break
        else:
            raise SystemExit(f"Nenhum driver ODBC do SQL Server encontrado: {pyodbc.drivers()}")
    p = [f"DRIVER={{{drv}}}", f"SERVER={os.getenv('SQL_SERVER', 'localhost')}", f"DATABASE={bd}"]
    if os.getenv("SQL_USER"):
        p += [f"UID={os.getenv('SQL_USER')}", f"PWD={os.getenv('SQL_PASSWORD', '')}"]
    else:
        p.append("Trusted_Connection=yes")
    if drv.startswith("ODBC Driver"):
        p.append("TrustServerCertificate=yes")
    return ";".join(p) + ";"


def main() -> int:
    carregar_env()
    nome_bd = os.getenv("SQL_DATABASE_COPA", "CopaDoMundo")
    with ifc_db.abrir(nome_bd) as conn:
        cur = conn.cursor()
        edicoes = cur.execute(SQL_EDICOES).fetchall()
        publico = cur.execute(SQL_PUBLICO).fetchall()
        vitorias = cur.execute(SQL_MAIOR_VITORIA).fetchall()
        artilheiros = cur.execute(SQL_ARTILHEIROS).fetchall()
        jogos_rank = cur.execute(SQL_RANKING_JOGOS).fetchall()
        selecoes_rank = cur.execute(SQL_SELECOES).fetchall()

    if not edicoes:
        print("Nenhuma edição concluída no banco; nada foi gravado.", file=sys.stderr)
        return 1

    ranking, sem_conf = montar_ranking(jogos_rank, selecoes_rank, [e[2] for e in edicoes])
    if sem_conf:
        print(f"Aviso: seleções sem confederação na tabela CONFEDERACAO (só aparecem no ranking geral): {', '.join(sem_conf)}", file=sys.stderr)
    dados = montar(edicoes, publico, vitorias, artilheiros, ler_proxima(), ranking=ranking)
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(dados['editions'])} edições e {len(dados['ranking'])} seleções no ranking gravadas em {SAIDA}")
    if dados["nextEdition"]:
        print(f"Próxima Copa: {dados['nextEdition']['year']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
