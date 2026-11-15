"""Testes das funções puras de estatísticas do exportador (sem banco). Dados inventados.
Rode: python scripts/test_estatisticas.py"""
import importlib.util
import sys
import unittest
from datetime import datetime
from pathlib import Path

spec = importlib.util.spec_from_file_location("export_edition", Path(__file__).with_name("export-edition.py"))
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)

CHAVES = ["Possession", "Goals", "XG"]
# (PartidaId, Ifes, data, cod mandante, cod visitante, id mandante, id visitante)
FIFA = [("900", "11", "2026-07-19", "AAA", "BBB", "1", "2"),
        ("901", "12", "2026-07-18", "CCC", "DDD", "3", "4")]
LINHAS = [("11", "1", "Possession", 0.6), ("11", "2", "Possession", 0.32), ("11", "1", "Goals", 1),
          ("11", "2", "Goals", 0), ("11", "1", "Texto", 5), ("11", "1", "XG", None),
          ("12", "3", "Goals", 2)]


# (Ifes, Selecao, Grupo, Nome, AtkRank, AtkNota, DefRank, DefNota, CriRank, CriNota, DGolRank, DGolNota)
RANK = [("11", "1", "linha", "Fulano Teste", 2, 5.26, 9, 4.0, 1, 7.14, None, None),
        ("11", "2", "linha", "Ciclano Teste", 1, 6.0, 3, 5.5, 5, 3.0, None, None),
        ("11", "2", "goleiro", "Goleiro Teste", None, None, None, None, None, None, 1, 8.04),
        ("11", "1", "linha", "Sem Nota", None, None, None, None, None, None, None, None),
        ("12", "3", "linha", "Outro Jogo", 1, 1.0, 1, 1.0, 1, 1.0, None, None)]


class Ranking(unittest.TestCase):
    def test_melhores_ordenados_por_posicao_com_o_lado(self):
        site = {1: (900, "2026-07-19", "AAA", "BBB")}
        r = ex.montar_ranking(ex.ligar_jogos(site, FIFA), site, RANK)[1]
        self.assertEqual([x["name"] for x in r["attack"]], ["Ciclano Teste", "Fulano Teste"])
        self.assertEqual(r["attack"][0], {"name": "Ciclano Teste", "side": "B", "rank": 1, "score": 6.0})
        self.assertEqual(r["creativity"][0]["name"], "Fulano Teste")
        self.assertEqual(r["creativity"][0]["score"], 7.1)
        self.assertEqual(r["goalkeepers"], [{"name": "Goleiro Teste", "side": "B", "rank": 1, "score": 8.0}])

    def test_lados_trocados(self):
        site = {1: (900, "2026-07-19", "BBB", "AAA")}
        r = ex.montar_ranking(ex.ligar_jogos(site, FIFA), site, RANK)[1]
        self.assertEqual(r["attack"][0]["side"], "A")

    def test_limita_ao_topo_e_ignora_jogo_sem_linhas(self):
        site = {1: (900, "2026-07-19", "AAA", "BBB")}
        r = ex.montar_ranking(ex.ligar_jogos(site, FIFA), site, RANK, topo=1)[1]
        self.assertEqual(len(r["attack"]), 1)
        self.assertEqual(ex.montar_ranking(ex.ligar_jogos(site, FIFA), site, []), {})


class Jogadores(unittest.TestCase):
    TOTAIS = [(1, "Goals", 5.0), (1, "TopSpeed", 33.456), (1, "Texto", 9), (2, "Goals", 1.0), (3, "Goals", 2.0),
              (4, "Goals", None)]
    ELENCO = [(1, "Atacante Teste", "FORWARD", "AAA"), (2, "Goleiro Teste", "goalkeeper", "BBB"),
              (4, "Sem Posicao", None, "BBB")]

    def test_monta_jogadores_com_time_e_posicao(self):
        r, fora = ex.montar_stats_jogadores(self.TOTAIS, self.ELENCO, ["Goals", "TopSpeed"])
        self.assertEqual([j["name"] for j in r], ["Atacante Teste", "Goleiro Teste"])
        self.assertEqual(r[0]["position"], "AT")
        self.assertEqual(r[1]["position"], "GO")  # ignora maiúsculas
        self.assertEqual(r[0]["stats"], {"Goals": 5.0, "TopSpeed": 33.46})  # arredonda; ignora o que não é pedido
        self.assertEqual(r[0]["team"], "AAA")

    def test_jogador_fora_do_elenco_e_contado(self):
        _r, fora = ex.montar_stats_jogadores(self.TOTAIS, self.ELENCO, ["Goals"])
        self.assertEqual(fora, 1)  # o 3

    def test_consulta_usa_as_mesmas_chaves(self):
        self.assertEqual(ex.SQL_JOGADORES_TOTAIS.count("?"), 1 + len(ex.ESTATISTICAS_JOGADOR))

    def test_chaves_sem_repeticao(self):
        self.assertEqual(len(set(ex.ESTATISTICAS_JOGADOR)), len(ex.ESTATISTICAS_JOGADOR))


class Estatisticas(unittest.TestCase):
    def test_liga_pelo_id_da_partida(self):
        site = {1: (900, "2026-07-19", "AAA", "BBB")}
        self.assertEqual(ex.ligar_jogos(site, FIFA)[1][1], "11")

    def test_liga_por_data_e_selecoes_quando_o_id_nao_bate(self):
        site = {7: (555, datetime(2026, 7, 19, 23, 0), "BBB", "AAA")}  # ordem trocada, ids diferentes
        self.assertEqual(ex.ligar_jogos(site, FIFA)[7][1], "11")
        longe = {8: (556, "2026-07-25", "AAA", "BBB")}
        self.assertEqual(ex.ligar_jogos(longe, FIFA), {})

    def test_monta_lados_e_ignora_o_que_nao_e_pedido(self):
        site = {1: (900, "2026-07-19", "AAA", "BBB")}
        r = ex.montar_estatisticas(ex.ligar_jogos(site, FIFA), site, LINHAS, CHAVES)
        self.assertEqual(r[1]["A"], {"Possession": 0.6, "Goals": 1.0})
        self.assertEqual(r[1]["B"], {"Possession": 0.32, "Goals": 0.0})

    def test_troca_os_lados_se_a_fifa_tem_mandante_invertido(self):
        site = {1: (900, "2026-07-19", "BBB", "AAA")}  # no site o A é a seleção BBB
        r = ex.montar_estatisticas(ex.ligar_jogos(site, FIFA), site, LINHAS, CHAVES)
        self.assertEqual(r[1]["A"]["Goals"], 0.0)
        self.assertEqual(r[1]["B"]["Goals"], 1.0)

    def test_jogo_sem_linhas_fica_de_fora(self):
        site = {2: (901, "2026-07-18", "CCC", "DDD"), 3: (900, "2026-07-19", "AAA", "BBB")}
        r = ex.montar_estatisticas(ex.ligar_jogos(site, FIFA), site, [], CHAVES)
        self.assertEqual(r, {})
        r = ex.montar_estatisticas(ex.ligar_jogos(site, FIFA), site, LINHAS, CHAVES)
        self.assertIn(2, r)  # só um lado com dados já entra
        self.assertEqual(r[2]["B"], {})

    def test_consulta_usa_as_mesmas_chaves(self):
        self.assertEqual(ex.SQL_FIFA_ESTATISTICAS.count("?"), len(ex.ESTATISTICAS_SITE))


if __name__ == "__main__":
    r = unittest.main(exit=False, verbosity=2)
    sys.exit(0 if r.result.wasSuccessful() else 1)
