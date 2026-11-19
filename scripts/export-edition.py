"""
Exporta os dados de uma edição da Copa do Mundo (seleções, grupos, classificação e jogos) do banco
CopaDoMundo para um arquivo JSON que o site lê: app/frontend/public/data/editions/copa-<ano>.json.

Na máquina que tem o SQL Server, na pasta do projeto:

    scripts\\exportar-edicao.bat            (edição 2026)
    scripts\\exportar-edicao.bat 2022       (outra edição)

Conexão: a mesma do export-stats.py (scripts/.env ou o .env do agente).
Horários: o banco guarda UTC; o arquivo traz horário de Brasília (UTC-3).
Só entram jogos com as duas seleções definidas; jogos de mata-mata ainda sem times ficam de fora.

Também grava um arquivo por seleção com o elenco completo, o técnico e os números de cada jogador na edição:
app/frontend/public/data/editions/copa-<ano>/teams/<CÓDIGO>.json

Também grava um arquivo por jogo com escalações, gols, cartões e substituições (com o minuto):
app/frontend/public/data/editions/copa-<ano>/matches/<número do jogo>.json
O site só baixa o arquivo do jogo que está sendo aberto. Use --sem-detalhes para pular essa parte.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
from collections import Counter
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402

SAIDA_DIR = ifc_db.pasta_saida_dados() / "editions"

ETAPAS = {
    "round of 32": "16 avos de final",
    "round of 16": "Oitavas de final",
    "quarter-final": "Quartas de final",
    "quarter-finals": "Quartas de final",
    "semi-final": "Semifinal",
    "semi-finals": "Semifinal",
    "play-off for third place": "Disputa do terceiro lugar",
    "third place": "Disputa do terceiro lugar",
    "third-place match": "Disputa do terceiro lugar",
    "3rd place": "Disputa do terceiro lugar",
    "match for third place": "Disputa do terceiro lugar",
    "bronze final": "Disputa do terceiro lugar",
    "final": "Final",
    "final round": "Fase final (grupo)",
    "preliminary round": "Rodada preliminar",
    "1st round": "Primeira rodada",
    "first round": "Primeira rodada",
    "second round": "Segunda fase",
    "second group stage": "Segunda fase de grupos",
}

SQL_CLASSIFICACAO = """
SELECT g.Nome, s.Codigo, COALESCE(s.NomePT, s.Nome), c.Posicao, c.Jogos, c.Vitorias, c.Empates,
       c.Derrotas, c.GolsPro, c.GolsContra, c.SaldoGols, c.Pontos
FROM dbo.Classificacao c
JOIN dbo.Grupos g   ON g.GrupoId = c.GrupoId
JOIN dbo.Selecoes s ON s.SelecaoId = c.SelecaoId
WHERE c.Edicao = ?
"""

SQL_PARTIDAS = """
SELECT p.PartidaId, p.NumeroJogo, p.DataHoraUTC, p.GolsMandante, p.GolsVisitante,
       f.Nome, g.Nome, m.Codigo, COALESCE(m.NomePT, m.Nome), v.Codigo, COALESCE(v.NomePT, v.Nome),
       e.Nome, e.Cidade, p.PenaltisMandante, p.PenaltisVisitante
FROM dbo.Partidas p
LEFT JOIN dbo.Fases f    ON f.FaseId = p.FaseId
LEFT JOIN dbo.Grupos g   ON g.GrupoId = p.GrupoId
LEFT JOIN dbo.Selecoes m ON m.SelecaoId = p.MandanteId
LEFT JOIN dbo.Selecoes v ON v.SelecaoId = p.VisitanteId
LEFT JOIN dbo.Estadios e ON e.EstadioId = p.EstadioId
WHERE p.Edicao = ? AND p.MandanteId IS NOT NULL AND p.VisitanteId IS NOT NULL
"""


SQL_DETALHES_PARTIDA = """
SELECT p.PartidaId, p.NumeroJogo, p.MandanteId, p.VisitanteId, p.Arbitro, p.Publico,
       p.TaticaMandante, p.TaticaVisitante, p.PenaltisMandante, p.PenaltisVisitante
FROM dbo.Partidas p
WHERE p.Edicao = ? AND p.MandanteId IS NOT NULL AND p.VisitanteId IS NOT NULL
"""

SQL_ESCALACOES = """
SELECT e.PartidaId, e.JogadorId, e.SelecaoId, e.Titular, e.Capitao, e.NumeroCamisa
FROM dbo.Escalacoes e JOIN dbo.Partidas p ON p.PartidaId = e.PartidaId WHERE p.Edicao = ?
"""

SQL_GOLS = """
SELECT g.PartidaId, g.SelecaoId, g.JogadorId, g.AssistenciaId, g.Minuto, g.Periodo, g.TipoCodigo
FROM dbo.Gols g JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId WHERE p.Edicao = ?
ORDER BY g.PartidaId, g.GolId
"""

SQL_CARTOES = """
SELECT c.PartidaId, c.SelecaoId, c.JogadorId, c.Cor, c.Minuto
FROM dbo.Cartoes c JOIN dbo.Partidas p ON p.PartidaId = c.PartidaId WHERE p.Edicao = ?
ORDER BY c.PartidaId, c.CartaoId
"""

SQL_SUBSTITUICOES = """
SELECT s.PartidaId, s.SelecaoId, s.SaiJogadorId, s.EntraJogadorId, s.Minuto
FROM dbo.Substituicoes s JOIN dbo.Partidas p ON p.PartidaId = s.PartidaId WHERE p.Edicao = ?
ORDER BY s.PartidaId, s.SubstituicaoId
"""

SQL_TREINADORES = """
SELECT t.PartidaId, t.SelecaoId, t.Nome
FROM dbo.Treinadores t JOIN dbo.Partidas p ON p.PartidaId = t.PartidaId WHERE p.Edicao = ?
"""

# Total em todas as Copas do banco (não só na edição exportada).
SQL_CARREIRA_JOGOS = """
SELECT x.JogadorId, COUNT(DISTINCT x.PartidaId) FROM (
  SELECT JogadorId, PartidaId FROM dbo.Escalacoes WHERE Titular = 1
  UNION SELECT EntraJogadorId, PartidaId FROM dbo.Substituicoes WHERE EntraJogadorId IS NOT NULL
) x GROUP BY x.JogadorId
"""

SQL_CARREIRA_GOLS = """
SELECT g.JogadorId, COUNT(*) FROM dbo.Gols g
JOIN dbo.Escalacoes e ON e.PartidaId = g.PartidaId AND e.JogadorId = g.JogadorId
WHERE g.JogadorId IS NOT NULL AND ISNULL(g.Periodo, 0) <> 11 AND e.SelecaoId = g.SelecaoId
GROUP BY g.JogadorId
"""

# Perfil vindo do agente copa-jogadores (Wikipédia): clubes, jogos e gols pela seleção. Tabela opcional.
SQL_PERFIS = """
SELECT JogadorId, JogosSelecao, GolsSelecao, Clubes FROM dbo.PerfilJogadores
WHERE Edicao = ? AND JogadorId IS NOT NULL
"""

SQL_ELENCO = """
SELECT e.SelecaoId, e.JogadorId, e.NumeroCamisa, e.Posicao FROM dbo.Elencos e WHERE e.Edicao = ?
"""

SQL_JOGADORES = """
SELECT j.JogadorId, COALESCE(j.NomeCurto, j.Nome), j.Posicao, j.DataNascimento, j.FotoUrl FROM dbo.Jogadores j
WHERE j.JogadorId IN (
  SELECT e.JogadorId FROM dbo.Elencos e WHERE e.Edicao = ?
  UNION
  SELECT e.JogadorId FROM dbo.Escalacoes e JOIN dbo.Partidas p ON p.PartidaId = e.PartidaId WHERE p.Edicao = ?
  UNION SELECT g.JogadorId FROM dbo.Gols g JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId WHERE p.Edicao = ?
  UNION SELECT g.AssistenciaId FROM dbo.Gols g JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId WHERE p.Edicao = ?
  UNION SELECT c.JogadorId FROM dbo.Cartoes c JOIN dbo.Partidas p ON p.PartidaId = c.PartidaId WHERE p.Edicao = ?
  UNION SELECT s.SaiJogadorId FROM dbo.Substituicoes s JOIN dbo.Partidas p ON p.PartidaId = s.PartidaId WHERE p.Edicao = ?
  UNION SELECT s.EntraJogadorId FROM dbo.Substituicoes s JOIN dbo.Partidas p ON p.PartidaId = s.PartidaId WHERE p.Edicao = ?
)
"""

# Gol de pênalti: lance do jogo (Eventos) no mesmo minuto e do mesmo jogador cujo texto fala em pênalti.
SQL_EVENTOS_PENALTI = """
SELECT ev.PartidaId, ev.JogadorId, ev.Minuto
FROM dbo.Eventos ev JOIN dbo.Partidas p ON p.PartidaId = ev.PartidaId
WHERE p.Edicao = ? AND (ev.Tipo LIKE '%enalt%' OR ev.Tipo LIKE '%ênalti%')
"""

# Estatísticas oficiais da FIFA (agente fifa-estatisticas). Tabelas opcionais.
# Mantenha esta lista igual a STAT_KEYS de app/frontend/src/data/match/stats.ts (há um teste que confere).
ESTATISTICAS_SITE = [
    "Possession", "Goals", "GoalsConceded", "GoalsInsideThePenaltyArea", "GoalsOutsideThePenaltyArea", "Assists",
    "AttemptAtGoal", "AttemptAtGoalOnTarget", "AttemptAtGoalOffTarget", "AttemptAtGoalBlocked",
    "AttemptAtGoalInsideThePenaltyArea", "AttemptAtGoalOutsideThePenaltyArea", "XG",
    "Passes", "PassesCompleted", "Crosses", "CrossesCompleted", "AttemptedBallProgressions",
    "CompletedBallProgressions", "DefensivePressuresApplied", "ForcedTurnovers", "GoalkeeperSaves",
    "Corners", "Offsides", "YellowCards", "RedCards", "TotalDistance", "TopSpeed",
    "Tackles", "FoulsCommitted",  # só a UEFA publica; a FIFA não tem, então não geram linhas na Copa
]

ESTATISTICAS_JOGADOR = [
    "Goals", "Assists", "TimePlayed", "AttemptAtGoalOnTarget",
    "AttemptAtGoal", "AttemptAtGoalInsideThePenaltyArea", "AttemptAtGoalOutsideThePenaltyArea", "HeadedAttemptAtGoal",
    "XG", "Corners", "Passes", "PassesCompleted",
    "Crosses", "CrossesCompleted", "LinebreaksAttemptedDefensiveLine", "LinebreaksAttemptedDefensiveLineCompleted",
    "AttemptedSwitchesOfPlay", "CompletedSwitchesOfPlay", "OwnGoals", "ForcedTurnovers",
    "DefensivePressuresApplied", "DirectDefensivePressuresApplied", "FoulsAgainst", "FoulsFor",
    "YellowCards", "RedCards", "IndirectRedCards", "Offsides",
    "GoalkeeperSaves", "GoalkeeperDefensiveActionsInsidePenaltyArea", "GoalkeeperDefensiveActionsOutsidePenaltyArea", "OffersToReceiveTotal",
    "OffersToReceiveInBehind", "OffersToReceiveInBetween", "OffersToReceiveInFront", "OffersToReceiveInside",
    "OffersToReceiveOutside", "ReceptionsInBehind", "ReceptionsBetweenMidfieldAndDefensiveLine", "ReceptionsUnderPressure",
    "NumberOfInvolvements", "TopSpeed", "SpeedRuns", "Sprints",
    "TotalDistance",
]

# Temporada da FIFA de cada edição (dbo.FifaPartidas.TemporadaId); outras edições: --temporada-fifa.
TEMPORADA_FIFA = {2026: "285023"}

SQL_JOGADORES_TOTAIS = (
    "SELECT e.JogadorId, e.Estatistica, "
    "CASE WHEN e.Estatistica = 'TopSpeed' THEN MAX(e.Valor) ELSE SUM(e.Valor) END "
    "FROM dbo.FifaEstatisticasJogador e JOIN dbo.FifaPartidas p ON p.PartidaIdIfes = e.PartidaIdIfes "
    "WHERE p.TemporadaId = ? AND e.Estatistica IN (" + ",".join("?" * len(ESTATISTICAS_JOGADOR)) + ") "
    "GROUP BY e.JogadorId, e.Estatistica"
)

SQL_JOGADORES_ELENCO = """
SELECT el.JogadorId, COALESCE(j.NomeCurto, j.Nome), el.Posicao, s.Codigo
FROM dbo.Elencos el
JOIN dbo.Jogadores j ON j.JogadorId = el.JogadorId
JOIN dbo.Selecoes s  ON s.SelecaoId = el.SelecaoId
WHERE el.Edicao = ?
"""

ABREV_POSICAO = {"GOALKEEPER": "GO", "DEFENDER": "DF", "MIDFIELDER": "MC", "FORWARD": "AT"}

SQL_FIFA_JOGOS = """
SELECT fp.PartidaId, fp.PartidaIdIfes, CONVERT(varchar(10), fp.Data, 23), fp.MandanteCodigo, fp.VisitanteCodigo,
       fp.MandanteId, fp.VisitanteId
FROM dbo.FifaPartidas fp
WHERE fp.PartidaIdIfes IN (SELECT PartidaIdIfes FROM dbo.FifaEstatisticasJogos)
"""

SQL_FIFA_ESTATISTICAS = (
    "SELECT PartidaIdIfes, SelecaoId, Estatistica, Valor FROM dbo.FifaEstatisticasSelecao "
    "WHERE Estatistica IN (" + ",".join("?" * len(ESTATISTICAS_SITE)) + ")"
)

SQL_FIFA_RANKING = """
SELECT PartidaIdIfes, SelecaoId, Grupo, Nome, AtaqueRank, AtaqueNota, DefesaRank, DefesaNota,
       CriatividadeRank, CriatividadeNota, DefesaGolRank, DefesaGolNota
FROM dbo.FifaPowerRanking
WHERE PartidaIdIfes IN (SELECT PartidaIdIfes FROM dbo.FifaEstatisticasJogos)
"""

POSICAO_PT = {"GOALKEEPER": "Goleiro", "DEFENDER": "Defensor", "MIDFIELDER": "Meio-campista", "FORWARD": "Atacante"}


def pos_pt(posicao):
    return POSICAO_PT.get((posicao or "").upper())


def foto_url(url):
    """A foto vem como modelo da FIFA ({format}/{size}); preenche o modelo ou descarta se sobrar chave."""
    if not url:
        return None
    url = url.replace("{format}", "sq").replace("{size}", "4")
    return url if url.startswith("http") and "{" not in url else None


PERIODO_DISPUTA = 11
COR_CARTAO = {"AMARELO": "yellow", "VERMELHO": "red", "SEGUNDO_AMARELO": "second-yellow"}
_MINUTO = re.compile(r"^\s*(\d{1,3})\s*'?\s*(?:\+\s*(\d{1,2})\s*'?)?\s*$")


def minuto(texto):
    """"45'+2'" -> ("45+2", 45.02); texto vazio ou fora do padrão -> None."""
    m = _MINUTO.match(texto or "")
    if not m:
        return None
    base, extra = int(m.group(1)), m.group(2)
    if extra is None:
        return str(base), float(base)
    return f"{base}+{int(extra)}", base + int(extra) / 100


def montar_detalhes(partidas, escalacoes, gols, cartoes, subs, treinadores, jogadores, penaltis):
    """
    Monta o detalhe de cada jogo. Função pura. Devolve ({numero_do_jogo: detalhe}, avisos).
    jogadores: {id: (nome, posicao)}; penaltis: conjunto de (PartidaId, JogadorId, Minuto bruto).
    """
    avisos = {"sem_minuto": 0, "sem_jogador": 0}
    esc: dict[int, list] = {}
    for pid, jid, sid, titular, capitao, camisa in escalacoes:
        esc.setdefault(pid, []).append((jid, sid, bool(titular), bool(capitao), camisa))
    por_tipo: dict[str, dict[int, list]] = {"g": {}, "c": {}, "s": {}}
    for r in gols:
        por_tipo["g"].setdefault(r[0], []).append(r)
    for r in cartoes:
        por_tipo["c"].setdefault(r[0], []).append(r)
    for r in subs:
        por_tipo["s"].setdefault(r[0], []).append(r)
    tecnicos: dict[tuple, str] = {}
    for pid, sid, nome in treinadores:
        if nome and (pid, sid) not in tecnicos:
            tecnicos[(pid, sid)] = nome

    def pessoa(jid):
        if jid is None or jid not in jogadores:
            avisos["sem_jogador"] += 1
            return None
        return {"id": int(jid), "name": jogadores[jid][0]}

    saida = {}
    for pid, numero, mand, visit, arbitro, publico, tat_m, tat_v, pen_m, pen_v in partidas:
        lado = {mand: "A", visit: "B"}
        time_do_jogador = {jid: sid for jid, sid, *_ in esc.get(pid, [])}
        eventos = []

        for _, sid, jid, assist, minu, periodo, _tipo in por_tipo["g"].get(pid, []):
            if sid not in lado:
                continue
            jogador = pessoa(jid)
            if not jogador:
                continue
            gol = {"type": "goal", "side": lado[sid], "player": jogador,
                   "assist": pessoa(assist) if assist is not None else None}
            if periodo == PERIODO_DISPUTA:
                gol.update(kind="shootout", minute="120", order=1000 + len(eventos))
                eventos.append(gol)
                continue
            m = minuto(minu)
            if not m:
                avisos["sem_minuto"] += 1
                continue
            contra = time_do_jogador.get(jid) not in (None, sid)
            penalti = (pid, jid, minu) in penaltis
            gol.update(kind="own" if contra else "penalty" if penalti else "normal", minute=m[0], order=m[1])
            eventos.append(gol)

        for _, sid, jid, cor, minu in por_tipo["c"].get(pid, []):
            m, jogador = minuto(minu), pessoa(jid)
            if sid not in lado or not jogador or cor not in COR_CARTAO:
                continue
            if not m:
                avisos["sem_minuto"] += 1
                continue
            eventos.append({"type": "card", "side": lado[sid], "minute": m[0], "order": m[1],
                            "player": jogador, "color": COR_CARTAO[cor]})

        for _, sid, sai, entra, minu in por_tipo["s"].get(pid, []):
            m, p_sai, p_entra = minuto(minu), pessoa(sai), pessoa(entra)
            if sid not in lado or not p_sai or not p_entra:
                continue
            if not m:
                avisos["sem_minuto"] += 1
                continue
            eventos.append({"type": "sub", "side": lado[sid], "minute": m[0], "order": m[1],
                            "out": p_sai, "in": p_entra})

        def time(sid, formacao):
            jog = []
            for jid, s_id, titular, capitao, camisa in esc.get(pid, []):
                if s_id != sid or jid not in jogadores:
                    continue
                jog.append({"id": int(jid), "number": camisa, "name": jogadores[jid][0],
                            "position": pos_pt(jogadores[jid][1]), "captain": capitao, "starter": titular})
            jog.sort(key=lambda j: (not j["starter"], j["number"] is None, j["number"] or 0))
            return {"code": "", "coach": tecnicos.get((pid, sid)), "formation": formacao, "players": jog}

        disputa = None
        if pen_m is not None and pen_v is not None:
            disputa = {"a": int(pen_m), "b": int(pen_v)}
        saida[int(numero if numero is not None else pid)] = {
            "referee": arbitro or None,
            "attendance": int(publico) if publico else None,
            "penalties": disputa,
            "teams": {"A": time(mand, tat_m), "B": time(visit, tat_v)},
            "events": sorted(eventos, key=lambda e: (e["order"],)),
        }
    return saida, avisos


def _dia(texto):
    """'2026-07-19' ou datetime -> date; None se não der."""
    from datetime import date

    if hasattr(texto, "date"):
        return texto.date()
    try:
        return date.fromisoformat(str(texto)[:10])
    except ValueError:
        return None


def ligar_jogos(jogos_site, jogos_fifa):
    """
    Liga cada jogo do site a um jogo de dbo.FifaPartidas. Função pura.
    jogos_site: {chave: (partida_id, data, codigo_A, codigo_B)}
    jogos_fifa: [(PartidaId, PartidaIdIfes, data, cod_mandante, cod_visitante, mandante_id, visitante_id)]
    Primeiro pelo id da partida; se não houver, pela data (±1 dia) e o par de seleções.
    Devolve {chave: linha_fifa}.
    """
    from datetime import timedelta

    por_id = {str(f[0]): f for f in jogos_fifa}
    por_par: dict = {}
    for f in jogos_fifa:
        d = _dia(f[2])
        if d:
            por_par.setdefault(frozenset((f[3], f[4])), []).append((d, f))
    ligacao = {}
    for chave, (pid, data, cod_a, cod_b) in jogos_site.items():
        f = por_id.get(str(pid))
        if f is None:
            d = _dia(data)
            for dj, fj in por_par.get(frozenset((cod_a, cod_b)), []):
                if d and abs((dj - d).days) <= 1:
                    f = fj
                    break
        if f is not None:
            ligacao[chave] = f
    return ligacao


def montar_estatisticas(ligacao, jogos_site, linhas, chaves):
    """
    {chave: {"A": {estatistica: valor}, "B": {...}}}. Função pura.
    linhas: [(PartidaIdIfes, SelecaoId, Estatistica, Valor)]. O lado A é a seleção A do site
    (se a FIFA tiver mandante/visitante invertidos em relação ao site, troca).
    """
    permitidas = set(chaves)
    valores: dict = {}
    for ifes, sel, nome, valor in linhas:
        if nome in permitidas and valor is not None:
            valores.setdefault(str(ifes), {}).setdefault(str(sel), {})[nome] = float(valor)
    saida = {}
    for chave, f in ligacao.items():
        _pid, ifes, _data, cod_m, cod_v, id_m, id_v = f
        cod_a = jogos_site[chave][2]
        id_a, id_b = (id_m, id_v) if (cod_m == cod_a or cod_v != cod_a) else (id_v, id_m)
        por_time = valores.get(str(ifes), {})
        a, b = por_time.get(str(id_a), {}), por_time.get(str(id_b), {})
        if a or b:
            saida[chave] = {"A": a, "B": b}
    return saida


def montar_ranking(ligacao, jogos_site, linhas, topo=5):
    """
    Melhores do jogo (power ranking da FIFA). Função pura.
    linhas: [(Ifes, SelecaoId, Grupo, Nome, AtaqueRank, AtaqueNota, DefesaRank, DefesaNota,
              CriatividadeRank, CriatividadeNota, DefesaGolRank, DefesaGolNota)]
    Devolve {chave: {"attack": [...], "defense": [...], "creativity": [...], "goalkeepers": [...]}} com até
    `topo` jogadores por lista (goleiros: 2), cada um {"name", "side", "rank", "score"}; rank 1 = melhor.
    """
    por_ifes: dict = {}
    for r in linhas:
        por_ifes.setdefault(str(r[0]), []).append(r)
    saida = {}
    for chave, f in ligacao.items():
        _pid, ifes, _data, cod_m, cod_v, id_m, id_v = f
        cod_a = jogos_site[chave][2]
        id_a, id_b = (id_m, id_v) if (cod_m == cod_a or cod_v != cod_a) else (id_v, id_m)
        lado = {str(id_a): "A", str(id_b): "B"}
        rows = por_ifes.get(str(ifes), [])

        def lista(grupo, i_rank, i_nota, n):
            itens = []
            for r in rows:
                if r[2] != grupo or r[i_rank] is None or r[i_nota] is None or not r[3]:
                    continue
                if str(r[1]) not in lado:
                    continue
                itens.append({"name": r[3], "side": lado[str(r[1])], "rank": int(r[i_rank]),
                              "score": round(float(r[i_nota]), 1)})
            return sorted(itens, key=lambda x: x["rank"])[:n]

        r = {"attack": lista("linha", 4, 5, topo), "defense": lista("linha", 6, 7, topo),
             "creativity": lista("linha", 8, 9, topo), "goalkeepers": lista("goleiro", 10, 11, 2)}
        if any(r.values()):
            saida[chave] = r
    return saida


def montar_stats_jogadores(totais, elenco, chaves):
    """
    Totais da edição por jogador. Função pura.
    totais: [(JogadorId, Estatistica, Valor)] (soma dos jogos; TopSpeed já é o maior valor)
    elenco: [(JogadorId, Nome, Posicao, CodigoSelecao)]
    Devolve (lista de jogadores, quantos ficaram de fora por não estarem no elenco do banco).
    """
    permitidas = set(chaves)
    por_jogador: dict = {}
    for jid, nome, valor in totais:
        if nome in permitidas and valor is not None:
            por_jogador.setdefault(int(jid), {})[nome] = round(float(valor), 2)
    info = {int(j[0]): j for j in elenco}
    saida, sem_elenco = [], 0
    for jid in sorted(por_jogador):
        if jid not in info:
            sem_elenco += 1
            continue
        _id, nome, pos, codigo = info[jid]
        if not nome or not codigo:
            sem_elenco += 1
            continue
        saida.append({
            "id": jid, "name": nome, "team": codigo,
            "position": ABREV_POSICAO.get(str(pos or "").upper()),
            "stats": por_jogador[jid],
        })
    saida.sort(key=lambda j: (j["team"], j["name"]))
    return saida, sem_elenco


def carreira(jid, carr_jogos, carr_gols, clubes, perfis):
    """Campos career, clubs e profileSource de um jogador: perfil da Wikipédia > totais em Copas; clubes.json > perfil."""
    perfil = perfis.get(jid) or {}
    if perfil.get("games") is not None or perfil.get("goals") is not None:
        career = {"games": int(perfil.get("games") or 0), "goals": int(perfil.get("goals") or 0), "scope": "selecao"}
    elif jid in carr_jogos or jid in carr_gols:
        career = {"games": int(carr_jogos.get(jid, 0)), "goals": int(carr_gols.get(jid, 0)), "scope": "copas"}
    else:
        career = None
    lista = [c for c in clubes.get(jid, []) if c] or [c for c in perfil.get("clubs", []) if c]
    fonte = "Wikipédia" if perfil and (career and career["scope"] == "selecao" or perfil.get("clubs")) and not clubes.get(jid) else None
    return {"career": career, "clubs": lista, "profileSource": fonte}


def montar_elencos(elenco, escalacoes, gols, cartoes, subs, treinadores, jogadores, codigos,
                   carreira_jogos=None, carreira_gols=None, clubes=None, perfis=None):
    """
    Monta o elenco completo de cada seleção, com o técnico e os números de cada jogador na edição.
    Função pura. codigos: {SelecaoId: código}. Devolve {código: elenco}.
    carreira_*: {JogadorId: total em todas as Copas}; clubes: {JogadorId: [clubes]} (arquivo opcional);
    perfis: {JogadorId: {games, goals, clubs}} do agente de perfis (tem prioridade sobre os totais em Copas).
    """
    jogos = Counter()
    titulares = Counter()
    gols_j = Counter()
    assist = Counter()
    amarelos = Counter()
    vermelhos = Counter()
    entrou = set()
    for pid, jid, sid, titular, capitao, camisa in escalacoes:
        if titular:
            jogos[jid] += 1
            titulares[jid] += 1
    for pid, sid, sai, entra, minu in subs:
        if entra is not None and (pid, entra) not in entrou:
            entrou.add((pid, entra))
            jogos[entra] += 1
    time_no_jogo = {(pid, jid): sid for pid, jid, sid, *_ in escalacoes}
    for pid, sid, jid, ass, minu, periodo, _t in gols:
        if periodo == PERIODO_DISPUTA or jid is None:
            continue
        if time_no_jogo.get((pid, jid), sid) != sid:
            continue  # gol contra não conta para o jogador
        gols_j[jid] += 1
        if ass is not None:
            assist[ass] += 1
    for pid, sid, jid, cor, minu in cartoes:
        if cor in ("AMARELO", "SEGUNDO_AMARELO"):
            amarelos[jid] += 1
        if cor in ("VERMELHO", "SEGUNDO_AMARELO"):
            vermelhos[jid] += 1

    carreira_jogos, carreira_gols, clubes, perfis = carreira_jogos or {}, carreira_gols or {}, clubes or {}, perfis or {}
    membros: dict[int, dict[int, dict]] = {}
    for sid, jid, camisa, pos in elenco:
        membros.setdefault(sid, {})[jid] = {"number": camisa, "pos": pos}
    for pid, jid, sid, titular, capitao, camisa in escalacoes:
        d = membros.setdefault(sid, {}).setdefault(jid, {"number": camisa, "pos": None})
        if d["number"] is None:
            d["number"] = camisa

    tecnicos: dict[int, Counter] = {}
    for pid, sid, nome in treinadores:
        if nome:
            tecnicos.setdefault(sid, Counter())[nome] += 1

    saida = {}
    for sid, lista in membros.items():
        codigo = codigos.get(sid)
        if not codigo:
            continue
        jog = []
        for jid, d in lista.items():
            if jid not in jogadores:
                continue
            nome, pos_bd, nasc, foto = (list(jogadores[jid]) + [None, None])[:4]
            jog.append({
                "id": int(jid),
                "number": d["number"],
                "name": nome,
                "position": pos_pt(d["pos"] or pos_bd),
                "birthDate": nasc.isoformat() if hasattr(nasc, "isoformat") else None,
                "photo": foto_url(foto),
                "games": jogos[jid],
                "starts": titulares[jid],
                "goals": gols_j[jid],
                "assists": assist[jid],
                "yellow": amarelos[jid],
                "red": vermelhos[jid],
                **carreira(jid, carreira_jogos, carreira_gols, clubes, perfis),
            })
        jog.sort(key=lambda j: (j["number"] is None, j["number"] or 0, j["name"]))
        tec = tecnicos.get(sid)
        coach = None
        if tec:
            nome, n = tec.most_common(1)[0]
            coach = {"name": nome, "matches": n}
        saida[codigo] = {"coach": coach, "players": jog}
    return saida


def ler_clubes():
    """scripts/clubes.json (opcional): {"<JogadorId>": ["Clube A", "Clube B"]}, do mais antigo ao atual."""
    arq = AQUI / "clubes.json"
    if not arq.exists():
        return {}
    bruto = json.loads(arq.read_text(encoding="utf-8"))
    return {int(k): [str(c) for c in v] for k, v in bruto.items() if isinstance(v, list)}


def letra_grupo(nome: str | None) -> str:
    """'Group A' / 'Grupo A' -> 'A'; outros nomes ficam como estão."""
    if not nome:
        return ""
    ultimo = nome.strip().split()[-1]
    return ultimo.upper() if len(ultimo) <= 2 else nome.strip()


def etapa(fase: str | None, grupo: str) -> str:
    if grupo:
        return "Fase de Grupos"
    if not fase:
        return "Fase final"
    return ETAPAS.get(fase.strip().lower(), fase.strip())


def montar(classificacao, partidas, agora=None) -> dict:
    """Transforma as linhas do banco no formato do site. Função pura, sem acesso a banco."""
    times: dict[str, dict] = {}
    grupos: dict[str, list] = {}
    for nome_g, codigo, nome, pos, jogos, v, e, d, gp, gc, sg, pts in classificacao:
        if not codigo:
            continue
        g = letra_grupo(nome_g)
        times[codigo] = {"code": codigo, "name": nome or codigo, "group": g}
        grupos.setdefault(g, []).append(
            (
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
            )
        )

    jogos_saida, ids, ignorados = [], set(), 0
    for pid, numero, utc, gm, gv, fase, nome_g, cod_a, nome_a, cod_b, nome_b, estadio, cidade, pen_m, pen_v in partidas:
        if not cod_a or not cod_b or utc is None:
            ignorados += 1
            continue
        for cod, nome in ((cod_a, nome_a), (cod_b, nome_b)):
            times.setdefault(cod, {"code": cod, "name": nome or cod, "group": ""})
        jid = int(numero if numero is not None else pid)
        if jid in ids:
            raise SystemExit(f"Número de jogo repetido: {jid}")
        ids.add(jid)
        local = utc - timedelta(hours=3)  # Brasília
        g = letra_grupo(nome_g)
        jogos_saida.append(
            {
                "id": jid,
                "date": local.strftime("%Y-%m-%d"),
                "time": local.strftime("%H:%M"),
                "teamA": cod_a,
                "teamB": cod_b,
                "scoreA": None if gm is None or gv is None else int(gm),
                "scoreB": None if gm is None or gv is None else int(gv),
                "group": g,
                "stadium": estadio or "",
                "city": cidade or "",
                "stage": etapa(fase, g),
                **(
                    {"penaltiesA": int(pen_m), "penaltiesB": int(pen_v)}
                    if pen_m is not None and pen_v is not None
                    else {}
                ),
            }
        )
    jogos_saida.sort(key=lambda j: (j["date"], j["time"], j["id"]))
    if ignorados:
        print(f"Aviso: {ignorados} jogo(s) sem data ou sem código de seleção foram ignorados.", file=sys.stderr)

    agora = agora or datetime.now(timezone.utc)
    return {
        "generatedAt": agora.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "teams": sorted(times.values(), key=lambda t: (t["group"] == "", t["group"], t["name"])),
        "groups": [
            {"name": g, "standings": [r[2] for r in sorted(linhas, key=lambda r: (r[0], r[1]))]}
            for g, linhas in sorted(grupos.items())
        ],
        "matches": jogos_saida,
    }


def _comum():
    """Reaproveita a conexão do export-stats.py."""
    spec = importlib.util.spec_from_file_location("export_stats", AQUI / "export-stats.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    ap = argparse.ArgumentParser(description="Exporta uma edição da Copa para o site")
    ap.add_argument("edicao", nargs="?", type=int, default=2026, help="ano da edição (padrão 2026)")
    ap.add_argument("--temporada-fifa", help="id da temporada na FIFA (padrão: Copa 2026 = 285023)")
    ap.add_argument("--sem-detalhes", action="store_true", help="não gravar os arquivos de cada jogo")
    args = ap.parse_args()

    comum = _comum()
    comum.carregar_env()
    nome_bd = os.getenv("SQL_DATABASE_COPA", "CopaDoMundo")
    erros = ifc_db.erros_banco()
    with ifc_db.abrir(nome_bd) as conn:
        cur = conn.cursor()
        classificacao = cur.execute(SQL_CLASSIFICACAO, args.edicao).fetchall()
        partidas = cur.execute(SQL_PARTIDAS, args.edicao).fetchall()
        detalhes = None
        if not args.sem_detalhes:
            ed = args.edicao
            detalhes = (
                cur.execute(SQL_DETALHES_PARTIDA, ed).fetchall(),
                cur.execute(SQL_ESCALACOES, ed).fetchall(),
                cur.execute(SQL_GOLS, ed).fetchall(),
                cur.execute(SQL_CARTOES, ed).fetchall(),
                cur.execute(SQL_SUBSTITUICOES, ed).fetchall(),
                cur.execute(SQL_TREINADORES, ed).fetchall(),
                {r[0]: (r[1], r[2], r[3], r[4]) for r in cur.execute(SQL_JOGADORES, ed, ed, ed, ed, ed, ed, ed).fetchall()},
                {(r[0], r[1], r[2]) for r in cur.execute(SQL_EVENTOS_PENALTI, ed).fetchall()},
            )
            elenco_bd = cur.execute(SQL_ELENCO, ed).fetchall()
            carr_jogos = {r[0]: r[1] for r in cur.execute(SQL_CARREIRA_JOGOS).fetchall()}
            carr_gols = {r[0]: r[1] for r in cur.execute(SQL_CARREIRA_GOLS).fetchall()}
            perfis = {}
            try:
                for r in cur.execute(SQL_PERFIS, ed).fetchall():
                    try:
                        lista_clubes = json.loads(r[3]) if r[3] else []
                    except ValueError:
                        lista_clubes = []
                    perfis[r[0]] = {"games": r[1], "goals": r[2], "clubs": lista_clubes}
            except erros:
                print("Aviso: tabela PerfilJogadores não existe; rode o agente copa-jogadores para ter clubes e jogos pela seleção.", file=sys.stderr)
            fifa_jogos, fifa_linhas, fifa_ranking = [], [], []
            try:
                fifa_jogos = cur.execute(SQL_FIFA_JOGOS).fetchall()
                fifa_linhas = cur.execute(SQL_FIFA_ESTATISTICAS, *ESTATISTICAS_SITE).fetchall()
                fifa_ranking = cur.execute(SQL_FIFA_RANKING).fetchall()
            except erros:
                print("Aviso: tabelas de estatísticas da FIFA não existem; rode o agente fifa-estatisticas.", file=sys.stderr)
            totais_jog, elenco_jog = [], []
            temporada = args.temporada_fifa or TEMPORADA_FIFA.get(ed)
            if temporada:
                try:
                    totais_jog = cur.execute(SQL_JOGADORES_TOTAIS, temporada, *ESTATISTICAS_JOGADOR).fetchall()
                    elenco_jog = cur.execute(SQL_JOGADORES_ELENCO, ed).fetchall()
                except erros:
                    print("Aviso: não consegui ler as estatísticas dos jogadores (rode o agente fifa-estatisticas).", file=sys.stderr)
            else:
                print("Aviso: edição sem temporada da FIFA conhecida; use --temporada-fifa para ter as estatísticas dos jogadores.", file=sys.stderr)

    if not classificacao and not partidas:
        print(f"Nada encontrado para a edição {args.edicao}; nada foi gravado.", file=sys.stderr)
        return 1

    dados = montar(classificacao, partidas)
    SAIDA_DIR.mkdir(parents=True, exist_ok=True)
    destino = SAIDA_DIR / f"copa-{args.edicao}.json"
    destino.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    com_placar = sum(1 for j in dados["matches"] if j["scoreA"] is not None)
    print(
        f"{len(dados['groups'])} grupos, {len(dados['teams'])} seleções, {len(dados['matches'])} jogos "
        f"({com_placar} com placar) gravados em {destino}"
    )

    if detalhes and totais_jog:
        jogadores_stats, sem_elenco = montar_stats_jogadores(totais_jog, elenco_jog, ESTATISTICAS_JOGADOR)
        destino_j = SAIDA_DIR / f"copa-{args.edicao}" / "player-stats.json"
        destino_j.parent.mkdir(parents=True, exist_ok=True)
        destino_j.write_text(
            json.dumps({"players": jogadores_stats}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
        )
        print(f"{len(jogadores_stats)} jogadores com estatísticas gravados em {destino_j}")
        if sem_elenco:
            print(f"Aviso: {sem_elenco} jogador(es) com estatísticas não estão no elenco do banco e ficaram de fora.", file=sys.stderr)

    if detalhes:
        por_jogo, avisos = montar_detalhes(*detalhes)
        codigos = {j["id"]: (j["teamA"], j["teamB"]) for j in dados["matches"]}
        pasta = SAIDA_DIR / f"copa-{args.edicao}" / "matches"
        pasta.mkdir(parents=True, exist_ok=True)
        jogos_site = {
            int(r[1] if r[1] is not None else r[0]): (r[0], r[2], r[7], r[9]) for r in partidas
        }
        estatisticas = montar_estatisticas(
            ligar_jogos(jogos_site, fifa_jogos), jogos_site, fifa_linhas, ESTATISTICAS_SITE
        )
        melhores = montar_ranking(ligar_jogos(jogos_site, fifa_jogos), jogos_site, fifa_ranking)
        gravados = 0
        for jid, det in por_jogo.items():
            if jid not in codigos:
                continue
            if jid in estatisticas:
                det["stats"] = estatisticas[jid]
            if jid in melhores:
                det["ranking"] = melhores[jid]
            det["teams"]["A"]["code"], det["teams"]["B"]["code"] = codigos[jid]
            (pasta / f"{jid}.json").write_text(
                json.dumps(det, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
            )
            gravados += 1
        # elencos: o código de cada seleção vem dos jogos (mandante = A)
        codigos_sid = {}
        for linha in detalhes[0]:
            ca = codigos.get(int(linha[1] if linha[1] is not None else linha[0]))
            if ca:
                codigos_sid[linha[2]], codigos_sid[linha[3]] = ca
        esc_bd, gols_bd, cart_bd, subs_bd, trein_bd, jog_bd = (
            detalhes[1], detalhes[2], detalhes[3], detalhes[4], detalhes[5], detalhes[6],
        )
        elencos = montar_elencos(
            elenco_bd, esc_bd, gols_bd, cart_bd, subs_bd, trein_bd, jog_bd, codigos_sid,
            carr_jogos, carr_gols, ler_clubes(), perfis,
        )
        pasta_t = SAIDA_DIR / f"copa-{args.edicao}" / "teams"
        pasta_t.mkdir(parents=True, exist_ok=True)
        for cod, el in elencos.items():
            (pasta_t / f"{cod}.json").write_text(
                json.dumps(el, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
            )
        total_jog = sum(len(e["players"]) for e in elencos.values())
        com_perfil = sum(1 for e in elencos.values() for j in e["players"] if j["profileSource"])
        print(f"{len(elencos)} elencos ({total_jog} jogadores, {com_perfil} com perfil da Wikipédia) gravados em {pasta_t}")
        com_lances = sum(1 for d in por_jogo.values() if d["events"])
        print(f"{gravados} arquivos de jogo ({com_lances} com lances, {len(estatisticas)} com estatísticas da FIFA, {len(melhores)} com ranking de jogadores) gravados em {pasta}")
        if fifa_jogos and not estatisticas:
            print("Aviso: há estatísticas da FIFA no banco, mas nenhuma foi ligada aos jogos desta edição.", file=sys.stderr)
        if avisos["sem_minuto"] or avisos["sem_jogador"]:
            print(
                f"Aviso: {avisos['sem_minuto']} lance(s) sem minuto legível e {avisos['sem_jogador']} "
                "referência(s) a jogador ausente foram ignorados.",
                file=sys.stderr,
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
