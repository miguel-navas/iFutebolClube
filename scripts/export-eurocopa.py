"""
Exporta a Eurocopa (fase final de cada edição, 1960-2024) do banco Eurocopa para os JSON do site:
app/frontend/public/data/editions/eurocopa-<ano>.json (+ pasta eurocopa-<ano>/ com teams, matches, player-stats).

    scripts\\exportar-eurocopa.bat            (todas as edições)
    python scripts/export-eurocopa.py 2024    (uma edição)

Lê o SQL Server (banco Eurocopa) ou, com IFC_BANCO=sqlite, data/sqlite/Eurocopa.sqlite.
Só a fase final (Etapa TOURNAMENT). Até 1976 o torneio final era só semifinais, 3º lugar e final;
as rodadas anteriores que a UEFA marca como TOURNAMENT eram eliminatórias e ficam de fora.
A edição "2020" foi disputada em 2021 (o ano da edição é o nome oficial).
Reaproveita as funções puras do exportador da Nations League.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402

COMPETICAO = "eurocopa"
SAIDA_DIR = ifc_db.pasta_saida_dados() / "editions"

_spec = importlib.util.spec_from_file_location("export_nl", AQUI / "export-nations-league.py")
nl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nl)

# Fase final: jogos cuja rodada é TOURNAMENT (até 1976 só semifinais, 3º lugar e final).
FIL = ("f.Etapa = 'TOURNAMENT' AND (p.Edicao >= 1980 OR "
       "f.Nome IN ('Semi-finals','Third place play-off','Final'))")
DE = "FROM dbo.Partidas p JOIN dbo.Fases f ON f.RoundId = p.RoundId"

SQL_EDICOES = "SELECT Edicao FROM dbo.Edicoes WHERE PartidasFinalizadas > 0 ORDER BY Edicao DESC"

SQL_CLASSIFICACAO = """
SELECT '', '', g.Nome, s.Codigo, COALESCE(s.NomePT, s.Nome), c.Posicao, c.Jogos, c.Vitorias,
       c.Empates, c.Derrotas, c.GolsPro, c.GolsContra, c.SaldoGols, c.Pontos
FROM dbo.Classificacao c
JOIN dbo.Grupos g   ON g.GrupoId = c.GrupoId
JOIN dbo.Selecoes s ON s.SelecaoId = c.SelecaoId
WHERE c.Edicao = ? AND g.Etapa = 'TOURNAMENT'
"""

SQL_PARTIDAS = f"""
SELECT p.PartidaId, f.NomePT, p.DataHoraUTC, p.GolsMandante, p.GolsVisitante,
       p.PenaltisMandante, p.PenaltisVisitante,
       '', '', g.Nome,
       m.Codigo, COALESCE(m.NomePT, m.Nome), v.Codigo, COALESCE(v.NomePT, v.Nome), e.Nome
{DE}
LEFT JOIN dbo.Grupos g   ON g.GrupoId = p.GrupoId
LEFT JOIN dbo.Selecoes m ON m.SelecaoId = p.MandanteId
LEFT JOIN dbo.Selecoes v ON v.SelecaoId = p.VisitanteId
LEFT JOIN dbo.Estadios e ON e.EstadioId = p.EstadioId
WHERE p.Edicao = ? AND p.Status = 'FINISHED' AND {FIL}
  AND p.MandanteId IS NOT NULL AND p.VisitanteId IS NOT NULL
"""

SQL_ELENCOS = f"""
SELECT s.Codigo, j.JogadorId, j.Nome, j.NomeCamisa, j.Posicao,
       MAX(COALESCE(es.NumeroCamisa, 0)), j.DataNascimento, j.FotoUrl,
       SUM(CASE WHEN es.Titular = 1 THEN 1 ELSE 0 END)
FROM dbo.Escalacoes es
JOIN dbo.Partidas p  ON p.PartidaId = es.PartidaId
JOIN dbo.Fases f     ON f.RoundId = p.RoundId
JOIN dbo.Jogadores j ON j.JogadorId = es.JogadorId
JOIN dbo.Selecoes s  ON s.SelecaoId = es.SelecaoId
WHERE p.Edicao = ? AND {FIL}
GROUP BY s.Codigo, j.JogadorId, j.Nome, j.NomeCamisa, j.Posicao, j.DataNascimento, j.FotoUrl
"""

SQL_GOLS = f"""
SELECT g.JogadorId, COUNT(*)
FROM dbo.Gols g
JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId
JOIN dbo.Fases f    ON f.RoundId = p.RoundId
WHERE p.Edicao = ? AND {FIL} AND g.JogadorId IS NOT NULL AND COALESCE(g.Tipo, '') <> 'OWN_GOAL'
GROUP BY g.JogadorId
"""

SQL_TECNICOS = f"""
SELECT s.Codigo, t.Nome, COUNT(*)
FROM dbo.Treinadores t
JOIN dbo.Partidas p ON p.PartidaId = t.PartidaId
JOIN dbo.Fases f    ON f.RoundId = p.RoundId
JOIN dbo.Selecoes s ON s.SelecaoId = t.SelecaoId
WHERE p.Edicao = ? AND {FIL} AND t.Nome IS NOT NULL
GROUP BY s.Codigo, t.Nome
"""

SQL_DET_PARTIDAS = f"""
SELECT p.PartidaId, p.MandanteId, p.VisitanteId, p.Publico, p.PenaltisMandante, p.PenaltisVisitante
{DE}
WHERE p.Edicao = ? AND p.Status = 'FINISHED' AND {FIL}
  AND p.GolsMandante IS NOT NULL AND p.MandanteId IS NOT NULL AND p.VisitanteId IS NOT NULL
"""

SQL_DET_ESCAL = f"""
SELECT es.PartidaId, es.SelecaoId, j.JogadorId, COALESCE(j.Nome, j.NomeCamisa),
       j.Posicao, es.NumeroCamisa, es.Titular, es.Funcao
FROM dbo.Escalacoes es
JOIN dbo.Partidas p  ON p.PartidaId = es.PartidaId
JOIN dbo.Fases f     ON f.RoundId = p.RoundId
JOIN dbo.Jogadores j ON j.JogadorId = es.JogadorId
WHERE p.Edicao = ? AND {FIL}
"""

SQL_DET_GOLS = f"""
SELECT g.PartidaId, g.SelecaoId, g.JogadorId, j.Nome, g.Minuto, g.Acrescimo, g.Tipo, g.Tempo
FROM dbo.Gols g
JOIN dbo.Partidas p ON p.PartidaId = g.PartidaId
JOIN dbo.Fases f    ON f.RoundId = p.RoundId
LEFT JOIN dbo.Jogadores j ON j.JogadorId = g.JogadorId
WHERE p.Edicao = ? AND {FIL}
"""

SQL_DET_TEC = f"""
SELECT t.PartidaId, t.SelecaoId, t.Nome
FROM dbo.Treinadores t
JOIN dbo.Partidas p ON p.PartidaId = t.PartidaId
JOIN dbo.Fases f    ON f.RoundId = p.RoundId
WHERE p.Edicao = ? AND {FIL} AND t.Nome IS NOT NULL
"""

SQL_DET_EST = f"""
SELECT e.PartidaId, e.SelecaoId, e.Estatistica, e.Valor
FROM dbo.EstatisticasSelecaoPartida e
JOIN dbo.Partidas p ON p.PartidaId = e.PartidaId
JOIN dbo.Fases f    ON f.RoundId = p.RoundId
WHERE p.Edicao = ? AND {FIL} AND e.Valor IS NOT NULL
"""

SQL_EST_JOGADOR = f"""
SELECT e.JogadorId, e.Estatistica,
       CASE WHEN e.Estatistica = 'top_speed' THEN MAX(e.Valor) ELSE SUM(e.Valor) END
FROM dbo.EstatisticasJogadorPartida e
JOIN dbo.Partidas p ON p.PartidaId = e.PartidaId
JOIN dbo.Fases f    ON f.RoundId = p.RoundId
WHERE p.Edicao = ? AND {FIL} AND e.Valor IS NOT NULL
GROUP BY e.JogadorId, e.Estatistica
"""


def _grava(caminho: Path, obj) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    tmp = caminho.with_suffix(caminho.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(caminho)


ETAPAS_PT = {
    "oitavos-de-final": "Oitavas de final",
    "quartos-de-final": "Quartas de final",
    "meias-finais": "Semifinal",
    "play-off - 3º lugar": "Disputa do terceiro lugar",
    "fase de grupos - fase final": "Fase de Grupos",
    "grupos": "Fase de Grupos",
    "final": "Final",
}


def _ajusta_nomes(dados: dict, edicao: int) -> None:
    """Português do Brasil: etapas e a Alemanha (a UEFA usa 'República Federal' em todas as edições)."""
    for j in dados["matches"]:
        j["stage"] = ETAPAS_PT.get(j["stage"].strip().lower(), j["stage"])
    for t in dados["teams"]:
        if t["code"] == "FRG":
            t["name"] = "Alemanha" if edicao >= 1992 else "Alemanha Ocidental"


def _troca_codigo(obj, de: str, para: str):
    """Troca um código de seleção em qualquer lugar da estrutura (valores e chaves)."""
    if isinstance(obj, dict):
        return {(para if k == de else k): _troca_codigo(v, de, para) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_troca_codigo(v, de, para) for v in obj]
    return para if obj == de else obj


def exportar_edicao(cur, edicao: int, codigos: dict) -> bool:
    q = lambda sql: cur.execute(sql, edicao).fetchall()  # noqa: E731
    dados = nl.montar(q(SQL_CLASSIFICACAO), q(SQL_PARTIDAS))
    _ajusta_nomes(dados, edicao)
    if not dados["matches"]:
        print(f"{edicao}: sem jogos da fase final, ignorada.", file=sys.stderr)
        return False
    jogadores = q(SQL_ELENCOS)
    elencos = nl.montar_elencos(jogadores, q(SQL_GOLS), q(SQL_TECNICOS))
    detalhes = nl.montar_detalhes(q(SQL_DET_PARTIDAS), q(SQL_DET_ESCAL), q(SQL_DET_GOLS),
                                  q(SQL_DET_TEC), q(SQL_DET_EST), codigos)
    jogs = nl.montar_estatisticas_jogadores(jogadores, q(SQL_EST_JOGADOR))
    if edicao >= 1992:  # a UEFA mantém o código da Alemanha Ocidental (FRG); desde 1992 é a Alemanha unificada
        dados, elencos, detalhes, jogs = (_troca_codigo(x, "FRG", "GER") for x in (dados, elencos, detalhes, jogs))
        antigo = SAIDA_DIR / f"{COMPETICAO}-{edicao}" / "teams" / "FRG.json"
        if antigo.exists():
            antigo.unlink()

    _grava(SAIDA_DIR / f"{COMPETICAO}-{edicao}.json", dados)
    base = SAIDA_DIR / f"{COMPETICAO}-{edicao}"
    for cod, el in elencos.items():
        _grava(base / "teams" / f"{cod}.json", el)
    for pid, d in detalhes.items():
        _grava(base / "matches" / f"{pid}.json", d)
    _grava(base / "player-stats.json", jogs)
    com_est = sum(1 for d in detalhes.values() if d["stats"])
    print(f"{edicao}: {len(dados['teams'])} seleções, {len(dados['groups'])} grupos, "
          f"{len(dados['matches'])} jogos, {len(detalhes)} detalhes ({com_est} c/ estatísticas), "
          f"{len(jogs['players'])} jogadores c/ estatísticas")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description="Exporta a Eurocopa para o site")
    ap.add_argument("edicao", nargs="?", type=int, help="ano da edição (padrão: todas)")
    args = ap.parse_args()

    comum = nl._comum()
    comum.carregar_env()
    nome_bd = os.getenv("SQL_DATABASE_EURO", "Eurocopa")
    with ifc_db.abrir(nome_bd) as conn:
        cur = conn.cursor()
        codigos = {r[0]: r[1] for r in cur.execute(nl.SQL_SELECOES).fetchall()}
        edicoes = [args.edicao] if args.edicao else [r[0] for r in cur.execute(SQL_EDICOES).fetchall()]
        feitas = [e for e in edicoes if exportar_edicao(cur, e, codigos)]
    print("Edições gravadas: " + ", ".join(str(e) for e in feitas))
    return 0 if feitas else 1


if __name__ == "__main__":
    raise SystemExit(main())
