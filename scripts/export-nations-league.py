"""
Exporta a edição da UEFA Nations League (seleções, grupos, classificação e jogos) do banco
UefaNationsLeague para o arquivo JSON que o site lê:
app/frontend/public/data/editions/nations-league-<edição>.json

Na máquina que tem o SQL Server, na pasta do projeto:

    scripts\\exportar-nations-league.bat            (edição 2027 = 2026/27)

Conexão: a mesma da Copa (scripts/.env ou o .env do agente). O banco padrão é UefaNationsLeague;
SQL_DATABASE_UNL troca o nome. Com IFC_BANCO=sqlite lê data/sqlite/UefaNationsLeague.sqlite.
Horários: o banco guarda UTC; o arquivo traz horário de Brasília (UTC-3).
Só entram jogos com as duas seleções definidas.
Cada grupo vira um rótulo com a liga na frente, como A1, B3, C2 ou D4.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402

SAIDA_DIR = ifc_db.pasta_saida_dados() / "editions"
COMPETICAO = "nations-league"
EDICAO_PADRAO = 2027

SQL_CLASSIFICACAO = """
SELECT l.Sigla, l.Nome, g.Nome, s.Codigo, COALESCE(s.NomePT, s.Nome), c.Posicao, c.Jogos, c.Vitorias,
       c.Empates, c.Derrotas, c.GolsPro, c.GolsContra, c.SaldoGols, c.Pontos
FROM dbo.Classificacao c
JOIN dbo.Grupos g   ON g.GrupoId = c.GrupoId
JOIN dbo.Ligas l    ON l.LigaId = g.LigaId
JOIN dbo.Selecoes s ON s.SelecaoId = c.SelecaoId
WHERE c.Edicao = ?
"""

SQL_PARTIDAS = """
SELECT p.PartidaId, p.Fase, p.DataHoraUTC, p.GolsMandante, p.GolsVisitante,
       p.PenaltisMandante, p.PenaltisVisitante,
       l.Sigla, l.Nome, g.Nome,
       m.Codigo, COALESCE(m.NomePT, m.Nome), v.Codigo, COALESCE(v.NomePT, v.Nome), e.Nome
FROM dbo.Partidas p
LEFT JOIN dbo.Grupos g   ON g.GrupoId = p.GrupoId
LEFT JOIN dbo.Ligas l    ON l.LigaId = g.LigaId
LEFT JOIN dbo.Selecoes m ON m.SelecaoId = p.MandanteId
LEFT JOIN dbo.Selecoes v ON v.SelecaoId = p.VisitanteId
LEFT JOIN dbo.Estadios e ON e.EstadioId = p.EstadioId
WHERE p.Edicao = ? AND p.MandanteId IS NOT NULL AND p.VisitanteId IS NOT NULL
"""

SQL_ELENCOS = """
SELECT s.Codigo, j.JogadorId, j.Nome, j.NomeCamisa, j.Posicao,
       MAX(COALESCE(es.NumeroCamisa, j.NumeroCamisa)), j.DataNascimento, j.FotoUrl,
       SUM(CASE WHEN es.Titular = 1 THEN 1 ELSE 0 END)
FROM dbo.Escalacoes es
JOIN dbo.Partidas p  ON p.PartidaId = es.PartidaId
JOIN dbo.Jogadores j ON j.JogadorId = es.JogadorId
JOIN dbo.Selecoes s  ON s.SelecaoId = es.SelecaoId
WHERE p.Edicao = ? AND s.Codigo IS NOT NULL
GROUP BY s.Codigo, j.JogadorId, j.Nome, j.NomeCamisa, j.Posicao, j.DataNascimento, j.FotoUrl
"""

SQL_GOLS = """
SELECT g.JogadorId, COUNT(*)
FROM dbo.Gols g
JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId
WHERE p.Edicao = ? AND g.JogadorId IS NOT NULL AND COALESCE(g.Tipo, '') <> 'OWN_GOAL'
GROUP BY g.JogadorId
"""

SQL_TECNICOS = """
SELECT s.Codigo, t.Nome, COUNT(*)
FROM dbo.Treinadores t
JOIN dbo.Partidas p ON p.PartidaId = t.PartidaId
JOIN dbo.Selecoes s ON s.SelecaoId = t.SelecaoId
WHERE p.Edicao = ? AND s.Codigo IS NOT NULL AND t.Nome IS NOT NULL
GROUP BY s.Codigo, t.Nome
"""

# Só jogadores ligados ao banco: o elenco da edição vem das súmulas, a Wikipédia apenas complementa.
SQL_PERFIS = """
SELECT SelecaoCodigo, JogadorId, JogosSelecao, GolsSelecao, Clubes, Fonte
FROM dbo.PerfilJogadores
WHERE Edicao = ? AND JogadorId IS NOT NULL
"""

SQL_DET_PARTIDAS = """
SELECT PartidaId, MandanteId, VisitanteId, Publico, PenaltisMandante, PenaltisVisitante
FROM dbo.Partidas
WHERE Edicao = ? AND GolsMandante IS NOT NULL AND MandanteId IS NOT NULL AND VisitanteId IS NOT NULL
"""

SQL_DET_ESCAL = """
SELECT es.PartidaId, es.SelecaoId, j.JogadorId, COALESCE(j.Nome, j.NomeCamisa),
       j.Posicao, COALESCE(es.NumeroCamisa, j.NumeroCamisa), es.Titular, es.Funcao
FROM dbo.Escalacoes es
JOIN dbo.Partidas p  ON p.PartidaId = es.PartidaId
JOIN dbo.Jogadores j ON j.JogadorId = es.JogadorId
WHERE p.Edicao = ?
"""

SQL_DET_GOLS = """
SELECT g.PartidaId, g.SelecaoId, g.JogadorId, j.Nome, g.Minuto, g.Acrescimo, g.Tipo, g.Tempo
FROM dbo.Gols g
JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId
LEFT JOIN dbo.Jogadores j ON j.JogadorId = g.JogadorId
WHERE p.Edicao = ?
"""

SQL_DET_TEC = """
SELECT t.PartidaId, t.SelecaoId, t.Nome
FROM dbo.Treinadores t
JOIN dbo.Partidas p ON p.PartidaId = t.PartidaId
WHERE p.Edicao = ? AND t.Nome IS NOT NULL
"""

SQL_DET_EST = """
SELECT e.PartidaId, e.SelecaoId, e.Estatistica, e.Valor
FROM dbo.EstatisticasSelecaoPartida e
JOIN dbo.Partidas p ON p.PartidaId = e.PartidaId
WHERE p.Edicao = ? AND e.Valor IS NOT NULL
"""

SQL_SELECOES = "SELECT SelecaoId, Codigo FROM dbo.Selecoes WHERE Codigo IS NOT NULL"

# Métrica da UEFA -> chave usada pela aba "Estatísticas" do site (mesmas chaves da Copa).
# fator: conversão de unidade (posse: % -> 0-1; distância: km -> m).
ESTATISTICAS = {
    "ball_possession": ("Possession", 0.01),
    "goals": ("Goals", 1),
    "goals_conceded": ("GoalsConceded", 1),
    "goals_scored_inside_penalty_area": ("GoalsInsideThePenaltyArea", 1),
    "goals_scored_outside_penalty_area": ("GoalsOutsideThePenaltyArea", 1),
    "assists": ("Assists", 1),
    "attempts": ("AttemptAtGoal", 1),
    "attempts_on_target": ("AttemptAtGoalOnTarget", 1),
    "attempts_off_target": ("AttemptAtGoalOffTarget", 1),
    "attempts_blocked": ("AttemptAtGoalBlocked", 1),
    "passes_attempted": ("Passes", 1),
    "passes_completed": ("PassesCompleted", 1),
    "cross_attempted": ("Crosses", 1),
    "cross_completed": ("CrossesCompleted", 1),
    "saves": ("GoalkeeperSaves", 1),
    "tackles": ("Tackles", 1),
    "corners": ("Corners", 1),
    "offsides": ("Offsides", 1),
    "fouls_committed": ("FoulsCommitted", 1),
    "yellow_cards": ("YellowCards", 1),
    "red_cards": ("RedCards", 1),
    "distance_covered": ("TotalDistance", 1000),
    "top_speed": ("TopSpeed", 1),
}

SQL_EST_JOGADOR = """
SELECT e.JogadorId, e.Estatistica,
       CASE WHEN e.Estatistica = 'top_speed' THEN MAX(e.Valor) ELSE SUM(e.Valor) END
FROM dbo.EstatisticasJogadorPartida e
JOIN dbo.Partidas p ON p.PartidaId = e.PartidaId
WHERE p.Edicao = ? AND e.Valor IS NOT NULL
GROUP BY e.JogadorId, e.Estatistica
"""

# Métrica da UEFA (por jogador) -> chave da página "Jogadores" (mesmas chaves da Copa); (chave, fator).
ESTATISTICAS_JOGADOR = {
    "goals": ("Goals", 1),
    "assists": ("Assists", 1),
    "minutes_played_official": ("TimePlayed", 1),
    "attempts_on_target": ("AttemptAtGoalOnTarget", 1),
    "attempts": ("AttemptAtGoal", 1),
    "shot_head": ("HeadedAttemptAtGoal", 1),
    "corners": ("Corners", 1),
    "passes_attempted": ("Passes", 1),
    "passes_completed": ("PassesCompleted", 1),
    "cross_attempted": ("Crosses", 1),
    "cross_completed": ("CrossesCompleted", 1),
    "own_goal_conceded": ("OwnGoals", 1),
    "fouls_committed": ("FoulsAgainst", 1),
    "fouls_suffered": ("FoulsFor", 1),
    "yellow_cards": ("YellowCards", 1),
    "red_cards": ("RedCards", 1),
    "offsides": ("Offsides", 1),
    "saves": ("GoalkeeperSaves", 1),
    "sprints": ("Sprints", 1),
    "top_speed": ("TopSpeed", 1),
    "distance_covered": ("TotalDistance", 1000),
}

ABREV_POSICAO = {"GOALKEEPER": "GO", "DEFENDER": "DF", "MIDFIELDER": "MC", "FORWARD": "AT",
                 "GK": "GO", "DF": "DF", "MF": "MC", "FW": "AT"}

POSICOES = {
    "GOALKEEPER": "Goleiro",
    "DEFENDER": "Defensor",
    "MIDFIELDER": "Meio-campista",
    "FORWARD": "Atacante",
    "GK": "Goleiro",
    "DF": "Defensor",
    "MF": "Meio-campista",
    "FW": "Atacante",
}

ETAPAS = {
    "quarter-final": "Quartas de final",
    "quarter-finals": "Quartas de final",
    "semi-final": "Semifinal",
    "semi-finals": "Semifinal",
    "play-off for third place": "Disputa do terceiro lugar",
    "third place": "Disputa do terceiro lugar",
    "third-place match": "Disputa do terceiro lugar",
    "3rd place": "Disputa do terceiro lugar",
    "final": "Final",
    "play-offs": "Playoffs",
    "play-off": "Playoffs",
    "promotion/relegation play-offs": "Playoffs de acesso e rebaixamento",
}


def letra_liga(sigla, nome) -> str:
    """'League A' (nome) ou 'LA' / 'A' (sigla) -> 'A'."""
    if nome and nome.strip():
        ultimo = nome.strip().split()[-1].upper()
        if len(ultimo) == 1:
            return ultimo
    if sigla and sigla.strip():
        return sigla.strip().upper()[-1]
    return ""


def rotulo_grupo(sigla, nome_liga, nome_grupo) -> str:
    """'Group 1' na Liga A -> 'A1'; 'Group A1' continua 'A1'; sem grupo -> ''."""
    if not nome_grupo or not nome_grupo.strip():
        return ""
    ultimo = nome_grupo.strip().split()[-1].upper()
    liga = letra_liga(sigla, nome_liga)
    if liga and not ultimo.startswith(liga):
        return f"{liga}{ultimo}"
    return ultimo


def etapa(fase, grupo: str) -> str:
    if grupo:
        return "Fase de Grupos"
    if not fase or not fase.strip():
        return "Fase final"
    return ETAPAS.get(fase.strip().lower(), fase.strip())


def montar(classificacao, partidas, agora=None) -> dict:
    """Transforma as linhas do banco no formato do site. Função pura, sem acesso a banco."""
    times: dict[str, dict] = {}
    grupos: dict[str, list] = {}

    for sigla, nome_l, nome_g, codigo, nome, pos, jogos, v, e, d, gp, gc, sg, pts in classificacao:
        if not codigo:
            continue
        g = rotulo_grupo(sigla, nome_l, nome_g)
        times[codigo] = {"code": codigo, "name": nome or codigo, "group": g}
        grupos.setdefault(g, []).append((
            pos if pos is not None else 999,
            -(pts or 0),
            {
                "code": codigo,
                "played": int(jogos or 0),
                "won": int(v or 0),
                "drawn": int(e or 0),
                "lost": int(d or 0),
                "goalsFor": int(gp or 0),
                "goalsAgainst": int(gc or 0),
                "goalDifference": int(sg or 0),
                "points": int(pts or 0),
            },
        ))

    jogos_saida, ids, ignorados = [], set(), 0
    sem_tabela: dict[str, dict[str, str]] = {}  # grupo -> {código: nome} de quem ainda não está na classificação
    for (pid, fase, utc, gm, gv, pen_m, pen_v, sigla, nome_l, nome_g,
         cod_a, nome_a, cod_b, nome_b, estadio) in partidas:
        if not cod_a or not cod_b or utc is None:
            ignorados += 1
            continue
        g = rotulo_grupo(sigla, nome_l, nome_g)
        for cod, nome in ((cod_a, nome_a), (cod_b, nome_b)):
            if cod not in times:
                times[cod] = {"code": cod, "name": nome or cod, "group": g}
                if g:
                    sem_tabela.setdefault(g, {})[cod] = nome or cod
        jid = int(pid)
        if jid in ids:
            raise SystemExit(f"Número de jogo repetido: {jid}")
        ids.add(jid)
        local = utc - timedelta(hours=3)  # Brasília
        placar = gm is not None and gv is not None
        jogos_saida.append({
            "id": jid,
            "date": local.strftime("%Y-%m-%d"),
            "time": local.strftime("%H:%M"),
            "teamA": cod_a,
            "teamB": cod_b,
            "scoreA": int(gm) if placar else None,
            "scoreB": int(gv) if placar else None,
            "group": g,
            "stadium": estadio or "",
            "city": "",
            "stage": etapa(fase, g),
            **({"penaltiesA": int(pen_m), "penaltiesB": int(pen_v)}
               if pen_m is not None and pen_v is not None else {}),
        })
    jogos_saida.sort(key=lambda j: (j["date"], j["time"], j["id"]))
    if ignorados:
        print(f"Aviso: {ignorados} jogo(s) sem data ou sem código de seleção foram ignorados.", file=sys.stderr)

    # Seleção que joga num grupo mas ainda não tem linha na classificação entra com zeros.
    for g, membros in sem_tabela.items():
        ja = {r[2]["code"] for r in grupos.get(g, [])}
        for cod in sorted(membros):
            if cod not in ja:
                grupos.setdefault(g, []).append((999, 0, {
                    "code": cod, "played": 0, "won": 0, "drawn": 0, "lost": 0,
                    "goalsFor": 0, "goalsAgainst": 0, "goalDifference": 0, "points": 0,
                }))

    agora = agora or datetime.now(timezone.utc)
    return {
        "generatedAt": agora.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "teams": sorted(times.values(), key=lambda t: (t["group"] == "", t["group"], t["name"])),
        "groups": [
            {"name": g, "standings": [r[2] for r in sorted(linhas, key=lambda r: (r[0], r[1]))]}
            for g, linhas in sorted(grupos.items()) if g
        ],
        "matches": jogos_saida,
    }


def _data_iso(v):
    if v is None:
        return None
    return v.strftime("%Y-%m-%d") if hasattr(v, "strftime") else str(v)[:10]


def montar_elencos(jogadores, gols, tecnicos, perfis=()) -> dict[str, dict]:
    """Elenco por seleção a partir das súmulas (quem já constou numa escalação, titular ou reserva).
    Função pura. `games` conta só as partidas como titular: a súmula não diz quem entrou do banco."""
    gols_por = {int(j): int(n) for j, n in gols}
    elencos: dict[str, dict] = {}
    for cod, jid, nome, camisa, pos, num, nasc, foto, titular in jogadores:
        nome_final = (nome or camisa or "").strip()
        if not cod or not nome_final:
            continue
        titular = int(titular or 0)
        pos_txt = POSICOES.get((pos or "").upper(), pos.title() if pos else None)
        elencos.setdefault(cod, {"coach": None, "players": []})["players"].append({
            "id": int(jid),
            "number": int(num) if num is not None else None,
            "name": nome_final,
            "position": pos_txt,
            "birthDate": _data_iso(nasc),
            "photo": foto if foto and str(foto).startswith("http") else None,
            "games": titular,
            "starts": titular,
            "goals": gols_por.get(int(jid), 0),
        })
    por_id = {(cod, p["id"]): p for cod, el in elencos.items() for p in el["players"]}
    for cod, jid, jogos, gols_sel, clubes_json, fonte in perfis:
        p = por_id.get((cod, int(jid)))
        if p is None:
            continue
        try:
            clubes = [c for c in json.loads(clubes_json or "[]") if isinstance(c, str) and c.strip()]
        except ValueError:
            clubes = []
        p["clubs"] = clubes
        if jogos is not None and gols_sel is not None:
            p["career"] = {"games": int(jogos), "goals": int(gols_sel), "scope": "selecao"}
        p["profileSource"] = "Wikipédia" if (clubes or jogos is not None) else None
    for cod, nome, partidas in tecnicos:
        el = elencos.get(cod)
        if not el or not nome or not nome.strip():
            continue
        if el["coach"] is None or int(partidas) > el["coach"]["matches"]:
            el["coach"] = {"name": nome.strip(), "matches": int(partidas)}
    for el in elencos.values():
        el["players"].sort(key=lambda p: (p["number"] is None, p["number"] or 0, p["name"]))
    return elencos


def _minuto(minuto, acrescimo) -> str | None:
    if minuto is None:
        return None
    return f"{int(minuto)}+{int(acrescimo)}" if acrescimo else str(int(minuto))


def montar_detalhes(partidas, escalacoes, gols, tecnicos, estatisticas, codigos) -> dict[int, dict]:
    """Detalhe de cada jogo finalizado (formato do site). Função pura.
    Entram escalações, técnico, gols e estatísticas por seleção. A UEFA não traz formação,
    árbitro nem cartões/substituições com minuto, então esses campos ficam vazios."""
    esc, gol, tec, est = {}, {}, {}, {}
    for pid, sel, jid, nome, pos, num, tit, funcao in escalacoes:
        if nome and str(nome).strip():
            esc.setdefault((pid, sel), []).append((jid, nome.strip(), pos, num, bool(tit), funcao))
    for linha in gols:
        gol.setdefault(linha[0], []).append(linha)
    for pid, sel, nome in tecnicos:
        tec.setdefault((pid, sel), nome.strip())
    for pid, sel, nome, valor in estatisticas:
        chave = ESTATISTICAS.get(nome)
        if chave:
            est.setdefault((pid, sel), {})[chave[0]] = round(float(valor) * chave[1], 4)

    saida = {}
    for pid, mand, vis, publico, pen_m, pen_v in partidas:
        lados = {"A": mand, "B": vis}
        times = {}
        for lado, sel in lados.items():
            cod = codigos.get(sel)
            if not cod:
                break
            jogs = sorted(esc.get((pid, sel), []), key=lambda x: (not x[4], x[3] is None, x[3] or 0, x[1]))
            times[lado] = {
                "code": cod,
                "coach": tec.get((pid, sel)),
                "formation": None,
                "players": [{
                    "id": int(jid), "number": int(num) if num is not None else None, "name": nome,
                    "position": POSICOES.get((pos or "").upper(), pos.title() if pos else None),
                    "captain": (funcao or "").upper().startswith("CAPT"), "starter": titular,
                } for jid, nome, pos, num, titular, funcao in jogs],
            }
        if len(times) != 2:
            continue
        eventos = []
        for i, (_, sel, jid, nome, minuto, acr, tipo, tempo) in enumerate(gol.get(pid, [])):
            lado = "A" if sel == mand else "B" if sel == vis else None
            if lado is None:
                continue
            tipo_u, tempo_u = (tipo or "").upper(), (tempo or "").upper()
            kind = ("shootout" if "SHOOTOUT" in tempo_u else "own" if "OWN" in tipo_u
                    else "penalty" if "PENALTY" in tipo_u else "normal")
            m = _minuto(minuto, acr) or ("0" if kind == "shootout" else None)
            if m is None:
                continue
            eventos.append({"type": "goal", "side": lado, "minute": m, "order": i,
                            "player": {"id": int(jid) if jid is not None else None, "name": nome or "Jogador"},
                            "assist": None, "kind": kind})
        stats = None
        if (pid, mand) in est and (pid, vis) in est:
            stats = {"A": est[(pid, mand)], "B": est[(pid, vis)]}
        saida[int(pid)] = {
            "referee": None,
            "attendance": int(publico) if publico is not None else None,
            "penalties": {"a": int(pen_m), "b": int(pen_v)} if pen_m is not None and pen_v is not None else None,
            "teams": times, "events": eventos, "stats": stats, "ranking": None,
        }
    return saida


def montar_estatisticas_jogadores(jogadores, est_jogador, agora=None) -> dict:
    """Totais da edição por jogador (formato de player-stats.json). Função pura.
    `jogadores` são as linhas de SQL_ELENCOS; só entra quem tem alguma estatística."""
    totais: dict[int, dict[str, float]] = {}
    for jid, nome, valor in est_jogador:
        chave = ESTATISTICAS_JOGADOR.get(nome)
        if chave and valor is not None:
            totais.setdefault(int(jid), {})[chave[0]] = round(float(valor) * chave[1], 4)
    saida = []
    for cod, jid, nome, camisa, pos, *_ in jogadores:
        nome_final = (nome or camisa or "").strip()
        stats = totais.get(int(jid))
        if not cod or not nome_final or not stats:
            continue
        saida.append({"id": int(jid), "name": nome_final, "team": cod,
                      "position": ABREV_POSICAO.get((pos or "").upper()), "stats": stats})
    saida.sort(key=lambda p: (-p["stats"].get("Goals", 0), p["name"]))
    agora = agora or datetime.now(timezone.utc)
    return {"generatedAt": agora.replace(microsecond=0).isoformat().replace("+00:00", "Z"), "players": saida}


def _comum():
    """Reaproveita a leitura do .env e a string de conexão do export-stats.py."""
    spec = importlib.util.spec_from_file_location("export_stats", AQUI / "export-stats.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    ap = argparse.ArgumentParser(description="Exporta a Nations League para o site")
    ap.add_argument("edicao", nargs="?", type=int, default=EDICAO_PADRAO,
                    help="edição, pelo ano UEFA da temporada (padrão 2027 = 2026/27)")
    args = ap.parse_args()

    comum = _comum()
    comum.carregar_env()
    nome_bd = os.getenv("SQL_DATABASE_UNL", "UefaNationsLeague")
    with ifc_db.abrir(nome_bd) as conn:
        cur = conn.cursor()
        classificacao = cur.execute(SQL_CLASSIFICACAO, args.edicao).fetchall()
        partidas = cur.execute(SQL_PARTIDAS, args.edicao).fetchall()
        jogadores = cur.execute(SQL_ELENCOS, args.edicao).fetchall()
        gols = cur.execute(SQL_GOLS, args.edicao).fetchall()
        tecnicos = cur.execute(SQL_TECNICOS, args.edicao).fetchall()
        det = [cur.execute(q, args.edicao).fetchall()
               for q in (SQL_DET_PARTIDAS, SQL_DET_ESCAL, SQL_DET_GOLS, SQL_DET_TEC, SQL_DET_EST)]
        est_jogador = cur.execute(SQL_EST_JOGADOR, args.edicao).fetchall()
        codigos = {r[0]: r[1] for r in cur.execute(SQL_SELECOES).fetchall()}
        try:
            perfis = cur.execute(SQL_PERFIS, args.edicao).fetchall()
        except Exception:  # agente de perfis ainda não rodou: tabela inexistente
            if hasattr(conn, "rollback"):  # SQLite (somente leitura) não tem rollback
                conn.rollback()
            perfis = []

    dados = montar(classificacao, partidas)
    if not dados["teams"] or not dados["groups"]:
        print(f"Nada para exportar: a edição {args.edicao} não tem seleções ou grupos no banco {nome_bd}.", file=sys.stderr)
        return 1

    SAIDA_DIR.mkdir(parents=True, exist_ok=True)
    destino = SAIDA_DIR / f"{COMPETICAO}-{args.edicao}.json"
    tmp = destino.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(destino)

    elencos = montar_elencos(jogadores, gols, tecnicos, perfis)
    pasta = SAIDA_DIR / f"{COMPETICAO}-{args.edicao}" / "teams"
    pasta.mkdir(parents=True, exist_ok=True)
    for cod, el in elencos.items():
        (pasta / f"{cod}.json").write_text(
            json.dumps(el, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    detalhes = montar_detalhes(*det, codigos)
    pasta_j = SAIDA_DIR / f"{COMPETICAO}-{args.edicao}" / "matches"
    pasta_j.mkdir(parents=True, exist_ok=True)
    for pid, d in detalhes.items():
        (pasta_j / f"{pid}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    jogs_stats = montar_estatisticas_jogadores(jogadores, est_jogador)
    (SAIDA_DIR / f"{COMPETICAO}-{args.edicao}" / "player-stats.json").write_text(
        json.dumps(jogs_stats, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    finalizados = sum(1 for j in dados["matches"] if j["scoreA"] is not None)
    print(f"Gravado {destino}")
    print(f"  {len(dados['teams'])} seleções, {len(dados['groups'])} grupos, "
          f"{len(dados['matches'])} jogos ({finalizados} com placar)")
    print(f"  Detalhes de jogo: {len(detalhes)} ({sum(1 for d in detalhes.values() if d['stats'])} com estatísticas)")
    print(f"  Estatísticas de jogadores: {len(jogs_stats['players'])}")
    print(f"  Elencos: {len(elencos)} seleções, {sum(len(e['players']) for e in elencos.values())} jogadores")
    print("  Grupos: " + ", ".join(g["name"] for g in dados["groups"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
