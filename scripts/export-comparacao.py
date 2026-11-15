#!/usr/bin/env python3
"""Dados da tela de comparação entre seleções (a partir de 1930).

Gera <saída>/comparison/h2h.json com:
  teams    seleções das edições do site (código, nome em português, nome no histórico);
  matches  jogos de 1930 em diante entre essas seleções: [data, A, B, gols A, gols B, classe, torneio];
  games    estatísticas (chutes, faltas, escanteios...) dos jogos coletados no site (Copa 2026 e Nations League).

Os nomes das seleções vêm do SQLite da Copa quando ele existe (PC); senão de data/historico/selecoes.json,
que este script grava a cada rodada com o SQLite. Uso: python export-comparacao.py
"""
from __future__ import annotations

import csv
import json
import sqlite3
import sys
import importlib.util
from datetime import datetime, timezone
from pathlib import Path

import historico
import ifc_db

AQUI = Path(__file__).resolve().parent
HIST = ifc_db.RAIZ / "data" / "historico"
CSV = HIST / "results.csv"
GOLEADORES = HIST / "goalscorers.csv"   # gols de cada jogo (martj42), com a marca de pênalti
ESTAT_COPAS = HIST / "copa_estatisticas.json"   # chutes, escanteios e impedimentos das Copas 2018 e 2022, gravado no PC e lido na VM
SELECOES = HIST / "selecoes.json"
DETALHES = HIST / "copa_detalhes.json"   # cartões e pênaltis das Copas, gravado quando o SQLite existe (PC) e lido na VM
BASE = ifc_db.pasta_saida_dados()
SAIDA = BASE / "comparison" / "h2h.json"
ANO_INICIAL = "1930"
EDICOES = ["copa-2026", "nations-league-2027"]
NOME_PT = {"INH": "Indonésia"}   # no banco da Copa 1938 a seleção aparece como Índias Orientais Holandesas; o histórico a une à Indonésia

# estatísticas somadas por seleção (as que o site já coleta por jogo)
ESTATISTICAS = ["Goals", "GoalsConceded", "AttemptAtGoal", "AttemptAtGoalOnTarget", "Corners", "FoulsCommitted",
                "YellowCards", "RedCards", "Offsides", "Passes", "PassesCompleted", "Crosses", "Tackles", "GoalkeeperSaves"]
# estatísticas que são média (posse) e não soma
MEDIAS = ["Possession"]


def _carregar_nl():
    spec = importlib.util.spec_from_file_location("nl", AQUI / "export-probabilidades-nl.py")
    nl = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(nl)
    return nl


def selecoes() -> dict[str, dict]:
    """código -> {name, en}"""
    sel: dict[str, dict] = {}
    caminho = ifc_db.caminho_sqlite("CopaDoMundo")
    if caminho.exists():
        con = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
        for cod, nome, pt in con.execute("SELECT Codigo, Nome, COALESCE(NomePT, Nome) FROM Selecoes"):
            sel[cod] = dict(name=pt, en=historico.nome(nome))
    elif SELECOES.exists():
        sel = json.loads(SELECOES.read_text(encoding="utf-8"))
    # Nations League: nome em português do snapshot, inglês do mapa do exportador de probabilidades
    nl = _carregar_nl()
    snap = BASE / "editions" / "nations-league-2027.json"
    if snap.exists():
        for t in json.loads(snap.read_text(encoding="utf-8"))["teams"]:
            sel.setdefault(t["code"], dict(name=t["name"], en=historico.nome(nl.NOME_EN[t["code"]])))
    return sel


def detalhes_copa(cod_de: dict[str, str]) -> list:
    """Cartões e pênaltis de cada jogo de Copa do Mundo (do SQLite): [data, A, B, amarelos A, amarelos B,
    vermelhos A, vermelhos B, pênaltis convertidos A, B, gols na disputa A, B, tem detalhes]. Vermelhos incluem o
    segundo amarelo (expulsão); pênaltis convertidos são os do tempo de jogo, sem a disputa."""
    caminho = ifc_db.caminho_sqlite("CopaDoMundo")
    if not caminho.exists():
        return json.loads(DETALHES.read_text(encoding="utf-8")) if DETALHES.exists() else []
    con = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
    cod = {sid: cod_de.get(historico.nome(nome)) for sid, nome in con.execute("SELECT SelecaoId, Nome FROM Selecoes")}
    cartoes: dict = {}
    for pid, sid, cor, n in con.execute("SELECT PartidaId, SelecaoId, Cor, COUNT(*) FROM Cartoes GROUP BY 1,2,3"):
        c = cartoes.setdefault((pid, sid), [0, 0])
        c[0 if cor == "AMARELO" else 1] += n
    penaltis = {(pid, sid): n for pid, sid, n in con.execute(
        "SELECT PartidaId, SelecaoId, COUNT(*) FROM Gols WHERE TipoCodigo = 1 GROUP BY 1,2")}
    out = []
    for pid, dh, m, v, pm, pv, det in con.execute(
            "SELECT PartidaId, DataHoraUTC, MandanteId, VisitanteId, PenaltisMandante, PenaltisVisitante, DetalhesCarregados "
            "FROM Partidas WHERE GolsMandante IS NOT NULL ORDER BY DataHoraUTC"):
        if not cod.get(m) or not cod.get(v):
            continue
        cm, cv = cartoes.get((pid, m), [0, 0]), cartoes.get((pid, v), [0, 0])
        out.append([str(dh)[:10], cod[m], cod[v], cm[0], cv[0], cm[1], cv[1],
                    penaltis.get((pid, m), 0), penaltis.get((pid, v), 0), pm or 0, pv or 0, 1 if det else 0])
    DETALHES.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    return out


def estatisticas_dos_jogos(sel) -> list:
    """Estatísticas de cada jogo coletado no site (Copa 2026 e Nations League), por seleção do jogo:
    [A, B, {estatística: valor de A}, {estatística: valor de B}, tipo de competição]. A tela soma só os jogos entre as duas escolhidas."""
    out = []
    for ed in EDICOES:
        for f in sorted((BASE / "editions" / ed / "matches").glob("*.json")):
            d = json.loads(f.read_text(encoding="utf-8"))
            stats = d.get("stats")
            if not stats or not stats.get("A") or not stats.get("B"):
                continue
            a, b = d["teams"]["A"]["code"], d["teams"]["B"]["code"]
            if a not in sel or b not in sel:
                continue
            lado = lambda x: {k: round(v, 3) for k, v in stats[x].items() if k in ESTATISTICAS + MEDIAS and v is not None}
            out.append([a, b, lado("A"), lado("B"), "copa" if ed.startswith("copa") else "liga"])
    return out


def estatisticas_copas_antigas(cod_de: dict[str, str]) -> list:
    """Chutes, escanteios e impedimentos (contados dos eventos) dos jogos das Copas 2018 e 2022, que o site não
    coletou como as de 2026, no mesmo formato de `games`: [A, B, valores A, valores B, "copa"]."""
    caminho = ifc_db.caminho_sqlite("CopaDoMundo")
    if not caminho.exists():
        return json.loads(ESTAT_COPAS.read_text(encoding="utf-8")) if ESTAT_COPAS.exists() else []
    con = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
    cod = {sid: cod_de.get(historico.nome(nome)) for sid, nome in con.execute("SELECT SelecaoId, Nome FROM Selecoes")}
    campo = {12: "AttemptAtGoal", 16: "Corners", 15: "Offsides"}
    conta: dict = {}
    for pid, sid, tipo, n in con.execute(
            "SELECT e.PartidaId, e.SelecaoId, e.TipoCodigo, COUNT(*) FROM Eventos e JOIN Partidas p USING(PartidaId) "
            "WHERE p.Edicao IN (2018, 2022) AND e.TipoCodigo IN (12, 16, 15) GROUP BY 1,2,3"):
        conta[(pid, sid, campo[tipo])] = n
    out = []
    for pid, m, v in con.execute("SELECT PartidaId, MandanteId, VisitanteId FROM Partidas WHERE Edicao IN (2018, 2022) AND GolsMandante IS NOT NULL ORDER BY DataHoraUTC"):
        if not cod.get(m) or not cod.get(v):
            continue
        lado = lambda sid: {k: conta.get((pid, sid, k), 0) for k in campo.values()}
        out.append([cod[m], cod[v], lado(m), lado(v), "copa"])
    ESTAT_COPAS.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    return out


def penaltis_dos_jogos(cod_de: dict[str, str]) -> list:
    """Pênaltis convertidos no tempo de jogo, por jogo: [data, A, B, pênaltis de A, pênaltis de B] (só jogos com pênalti)."""
    if not GOLEADORES.exists():
        return []
    por_jogo: dict[tuple, list[int]] = {}
    with GOLEADORES.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["penalty"] != "TRUE" or r["own_goal"] == "TRUE" or r["date"][:4] < ANO_INICIAL:
                continue
            a, b = cod_de.get(historico.nome(r["home_team"])), cod_de.get(historico.nome(r["away_team"]))
            quem = cod_de.get(historico.nome(r["team"]))
            if not a or not b or a == b or quem not in (a, b):
                continue
            v = por_jogo.setdefault((r["date"], a, b), [0, 0])
            v[0 if quem == a else 1] += 1
    return [[d, a, b, x, y] for (d, a, b), (x, y) in sorted(por_jogo.items())]


def main() -> int:
    if not CSV.exists():
        print(f"Falta {CSV}", file=sys.stderr)
        return 1
    sel = selecoes()
    if not sel:
        print("Sem lista de seleções.", file=sys.stderr)
        return 1
    SELECOES.write_text(json.dumps(sel, ensure_ascii=False, indent=0), encoding="utf-8")
    por_en: dict[str, list[str]] = {}
    for cod, s in sel.items():
        por_en.setdefault(s["en"], []).append(cod)
    ativos = set()   # seleções das edições do site: têm preferência quando duas siglas dão no mesmo nome (YUG/SRB, INH/IDN)
    for arq in (BASE / "editions" / "copa-2026.json", BASE / "editions" / "nations-league-2027.json"):
        if arq.exists():
            ativos |= {t["code"] for t in json.loads(arq.read_text(encoding="utf-8")).get("teams", [])}
    cod_de = {en: next((c for c in cods if c in ativos), cods[0]) for en, cods in por_en.items()}

    torneios: list[str] = []
    jogos = []
    with CSV.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["date"][:4] < ANO_INICIAL or r["home_score"] in ("", "NA") or r["away_score"] in ("", "NA"):
                continue
            a, b = cod_de.get(historico.nome(r["home_team"])), cod_de.get(historico.nome(r["away_team"]))
            if not a or not b or a == b:
                continue
            if r["tournament"] not in torneios:
                torneios.append(r["tournament"])
            jogos.append([r["date"], a, b, int(r["home_score"]), int(r["away_score"]),
                          historico.classe(r["tournament"]), torneios.index(r["tournament"])])
    jogos.sort(key=lambda j: j[0])

    teams = [dict(code=cod, name=NOME_PT.get(cod, s["name"]), history=s["en"]) for cod, s in sorted(sel.items(), key=lambda kv: kv[1]["name"])
             if cod_de.get(s["en"]) == cod]
    saida = dict(generatedAt=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), since=int(ANO_INICIAL),
                 sources="Histórico: martj42/international_results (domínio público). Estatísticas: jogos coletados no site.",
                 teams=teams, tournaments=torneios, matches=jogos, games=estatisticas_dos_jogos(sel) + estatisticas_copas_antigas(cod_de),
                 copa=detalhes_copa(cod_de), penaltis=penaltis_dos_jogos(cod_de))
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Gravado {SAIDA} ({SAIDA.stat().st_size // 1024} KB): {len(teams)} seleções, {len(jogos)} jogos desde {ANO_INICIAL}, "
          f"{len(saida['games'])} jogos com estatísticas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
