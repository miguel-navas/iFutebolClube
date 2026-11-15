import math
import unittest

import historico
from modelo_probabilidades import Elo, amostrar_gols, probabilidades


class Probabilidades(unittest.TestCase):
    def test_soma_um_e_simetria(self):
        a = probabilidades(120)
        b = probabilidades(-120)
        self.assertAlmostEqual(sum(a), 1.0, places=9)
        self.assertAlmostEqual(a[0], b[2], places=9)
        self.assertAlmostEqual(a[1], b[1], places=9)

    def test_favorito_tem_mais_chance(self):
        v, e, d = probabilidades(200)
        self.assertGreater(v, d)
        self.assertGreater(v, 0.5)
        self.assertAlmostEqual(probabilidades(0)[0], probabilidades(0)[2], places=9)


class EloTeste(unittest.TestCase):
    def test_vencedor_sobe_e_perdedor_desce(self):
        e = Elo()
        e.atualizar("A", "B", 2, 0, "copa", True)
        self.assertGreater(e.r["A"], 1500)
        self.assertAlmostEqual(e.r["A"] + e.r["B"], 3000.0, places=6)

    def test_mandante_em_campo_nao_neutro(self):
        e = Elo()
        self.assertGreater(e.diferenca("A", "B", False), e.diferenca("A", "B", True))

    def test_amostrar_gols_media(self):
        import random
        rng = random.Random(1)
        n = 4000
        total = sum(sum(amostrar_gols(0, rng)) for _ in range(n)) / n
        self.assertAlmostEqual(total, 2.3, delta=0.15)


class Nomes(unittest.TestCase):
    def test_apelidos(self):
        self.assertEqual(historico.nome("Korea Republic"), "South Korea")
        self.assertEqual(historico.nome("Czechoslovakia"), "Czech Republic")
        self.assertEqual(historico.nome("Brazil"), "Brazil")

    def test_classes(self):
        self.assertEqual(historico.classe("FIFA World Cup"), "copa")
        self.assertEqual(historico.classe("FIFA World Cup qualification"), "eliminatoria")
        self.assertEqual(historico.classe("UEFA Nations League"), "liga")
        self.assertEqual(historico.classe("Friendly"), "amistoso")


class NationsLeague(unittest.TestCase):
    def test_nomes_do_histórico_existem(self):
        import importlib.util, pathlib
        spec = importlib.util.spec_from_file_location("nl", pathlib.Path(__file__).parent / "export-probabilidades-nl.py")
        nl = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(nl)
        self.assertEqual(len(nl.NOME_EN), 54)
        self.assertEqual(len(set(nl.NOME_EN.values())), 54)
        for nome in nl.NOME_EN.values():
            self.assertEqual(historico.nome(nome), nome)  # já está no nome do histórico


if __name__ == "__main__":
    unittest.main()
