"""Testes do exportador da Nations League (funções puras, sem banco).

    python scripts/test_nations_league.py
"""
from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
spec = importlib.util.spec_from_file_location("export_nl", AQUI / "export-nations-league.py")
nl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nl)

AGORA = datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc)


class RotuloGrupo(unittest.TestCase):
    def test_liga_na_frente(self):
        self.assertEqual(nl.rotulo_grupo("A", "League A", "Group 1"), "A1")

    def test_nome_ja_com_liga(self):
        self.assertEqual(nl.rotulo_grupo("B", "League B", "Group B3"), "B3")

    def test_liga_pelo_nome(self):
        self.assertEqual(nl.rotulo_grupo(None, "League C", "Group 2"), "C2")

    def test_sigla_com_dois_caracteres(self):
        # o banco real traz Sigla "LA" e grupos "A1": não pode virar "LAA1"
        self.assertEqual(nl.rotulo_grupo("LA", "League A", "A1"), "A1")
        self.assertEqual(nl.rotulo_grupo("LD", "League D", "D2"), "D2")
        self.assertEqual(nl.rotulo_grupo("LB", None, "B3"), "B3")

    def test_sem_grupo(self):
        self.assertEqual(nl.rotulo_grupo("A", "League A", None), "")


class Etapa(unittest.TestCase):
    def test_grupo(self):
        self.assertEqual(nl.etapa("Anything", "A1"), "Fase de Grupos")

    def test_mata_mata(self):
        self.assertEqual(nl.etapa("Semi-finals", ""), "Semifinal")
        self.assertEqual(nl.etapa(None, ""), "Fase final")
        self.assertEqual(nl.etapa("Algo novo", ""), "Algo novo")


class Montar(unittest.TestCase):
    classificacao = [
        ("A", "League A", "Group 1", "POR", "Portugal", 1, 1, 1, 0, 0, 2, 0, 2, 3),
        ("A", "League A", "Group 1", "ESP", "Espanha", 2, 1, 0, 0, 1, 0, 2, -2, 0),
    ]
    partidas = [
        (101, "Group stage", datetime(2026, 9, 24, 21, 45), 2, 0, None, None,
         "A", "League A", "Group 1", "POR", "Portugal", "ESP", "Espanha", "Estádio da Luz"),
        (102, "Group stage", datetime(2026, 11, 12, 22, 0), None, None, None, None,
         "A", "League A", "Group 1", "ESP", "Espanha", "POR", "Portugal", "La Cartuja"),
        # grupo B ainda sem classificação: entra com zeros
        (201, "Group stage", datetime(2026, 11, 12, 19, 45), None, None, None, None,
         "B", "League B", "Group 2", "ISR", "Israel", "SUI", "Suíça", "Bloomfield"),
    ]

    def setUp(self):
        self.d = nl.montar(self.classificacao, self.partidas, AGORA)

    def test_grupos_e_ordem(self):
        self.assertEqual([g["name"] for g in self.d["groups"]], ["A1", "B2"])
        self.assertEqual([r["code"] for r in self.d["groups"][0]["standings"]], ["POR", "ESP"])

    def test_grupo_sem_classificacao_entra_com_zeros(self):
        b2 = self.d["groups"][1]["standings"]
        self.assertEqual({r["code"] for r in b2}, {"ISR", "SUI"})
        self.assertTrue(all(r["points"] == 0 and r["played"] == 0 for r in b2))

    def test_horario_de_brasilia(self):
        j = next(x for x in self.d["matches"] if x["id"] == 101)
        self.assertEqual((j["date"], j["time"]), ("2026-09-24", "18:45"))
        self.assertEqual((j["scoreA"], j["scoreB"]), (2, 0))

    def test_jogo_sem_placar(self):
        j = next(x for x in self.d["matches"] if x["id"] == 102)
        self.assertIsNone(j["scoreA"])
        self.assertEqual(j["stage"], "Fase de Grupos")
        self.assertEqual(j["group"], "A1")

    def test_ordem_e_times(self):
        self.assertEqual([j["id"] for j in self.d["matches"]], [101, 201, 102])
        self.assertEqual({t["code"] for t in self.d["teams"]}, {"POR", "ESP", "ISR", "SUI"})

    def test_formato_aceito_pelo_site(self):
        self.assertTrue(self.d["generatedAt"].endswith("Z"))
        for t in self.d["teams"]:
            self.assertTrue(t["group"])


class Elencos(unittest.TestCase):
    JOG = [
        ("POR", 1, "Rúben Dias", None, "DEFENDER", 4, "1997-05-14", "https://x/y.png", 3),
        ("POR", 2, "Diogo Costa", "D. COSTA", "GOALKEEPER", 1, None, "", 4),
        ("ESP", 3, "", None, "FORWARD", 9, None, None, 1),
    ]

    def setUp(self):
        self.e = nl.montar_elencos(
            self.JOG, [(1, 2), (2, 0)],
            [("POR", "Roberto Martínez", 4), ("POR", "Interino", 1), ("ESP", "X", 2)])

    def test_jogadores_ordenados_e_traduzidos(self):
        p = self.e["POR"]["players"]
        self.assertEqual([x["name"] for x in p], ["Diogo Costa", "Rúben Dias"])
        self.assertEqual(p[1]["position"], "Defensor")
        self.assertEqual(p[1]["goals"], 2)
        self.assertEqual(p[1]["starts"], 3)
        self.assertIsNone(p[0]["photo"])

    def test_tecnico_mais_frequente(self):
        self.assertEqual(self.e["POR"]["coach"], {"name": "Roberto Martínez", "matches": 4})

    def test_perfil_so_complementa_quem_esta_nas_sumulas(self):
        e = nl.montar_elencos(
            self.JOG, [], [],
            [("POR", 1, 60, 5, '["Benfica (2016–2018)", "Man City"]', "https://x"),
             ("POR", 999, 10, 1, "[]", "https://x")])
        dias = [x for x in e["POR"]["players"] if x["id"] == 1][0]
        self.assertEqual(dias["career"], {"games": 60, "goals": 5, "scope": "selecao"})
        self.assertEqual(dias["clubs"][-1], "Man City")
        self.assertEqual(len(e["POR"]["players"]), 2)

    def test_jogador_sem_nome_fica_de_fora(self):
        self.assertNotIn("ESP", self.e)


class Detalhes(unittest.TestCase):
    def setUp(self):
        self.d = nl.montar_detalhes(
            [(7, 1, 2, 30000, None, None)],
            [(7, 1, 10, "Rúben Dias", "DEFENDER", 4, 1, "CAPTAIN"), (7, 1, 11, "Reserva", "FORWARD", 20, 0, None),
             (7, 2, 12, "Unai Simón", "GOALKEEPER", 1, 1, None)],
            [(7, 1, 10, "Rúben Dias", 45, 2, "SCORED", "FIRST_HALF"), (7, 2, None, None, 80, None, "PENALTY", "SECOND_HALF")],
            [(7, 1, "Roberto Martínez"), (7, 2, "De la Fuente")],
            [(7, 1, "ball_possession", 60), (7, 2, "ball_possession", 40), (7, 1, "distance_covered", 110.5),
             (7, 2, "distance_covered", 108), (7, 1, "metrica_desconhecida", 3)],
            {1: "POR", 2: "ESP"})[7]

    def test_times_e_titulares(self):
        a = self.d["teams"]["A"]
        self.assertEqual((a["code"], a["coach"]), ("POR", "Roberto Martínez"))
        self.assertEqual([p["starter"] for p in a["players"]], [True, False])
        self.assertTrue(a["players"][0]["captain"])

    def test_gols(self):
        g = self.d["events"]
        self.assertEqual([(e["side"], e["minute"], e["kind"]) for e in g], [("A", "45+2", "normal"), ("B", "80", "penalty")])
        self.assertEqual(g[1]["player"]["name"], "Jogador")

    def test_estatisticas_convertidas(self):
        s = self.d["stats"]
        self.assertEqual(s["A"]["Possession"], 0.6)
        self.assertEqual(s["A"]["TotalDistance"], 110500)
        self.assertNotIn("metrica_desconhecida", s["A"])

    def test_sem_estatistica_de_um_lado(self):
        d = nl.montar_detalhes([(7, 1, 2, None, None, None)], [], [], [], [(7, 1, "goals", 1)], {1: "POR", 2: "ESP"})[7]
        self.assertIsNone(d["stats"])


class EstatisticasJogadores(unittest.TestCase):
    def test_totais_posicao_e_filtro(self):
        d = nl.montar_estatisticas_jogadores(
            [("POR", 1, "Rúben Dias", None, "DEFENDER", 4), ("POR", 2, "Sem Stats", None, "FORWARD", 9),
             ("ESP", 3, "Morata", None, "FORWARD", 7)],
            [(1, "goals", 2), (1, "distance_covered", 21.5), (1, "ignorada", 9), (3, "goals", 3)])
        p = d["players"]
        self.assertEqual([x["name"] for x in p], ["Morata", "Rúben Dias"])
        self.assertEqual(p[1]["position"], "DF")
        self.assertEqual(p[1]["stats"], {"Goals": 2.0, "TotalDistance": 21500.0})
        self.assertTrue(d["generatedAt"].endswith("Z"))


if __name__ == "__main__":
    unittest.main()
