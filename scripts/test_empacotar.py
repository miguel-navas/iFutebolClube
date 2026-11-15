"""Teste do empacotador (sem build, sem npm). Rode: python scripts/test_empacotar.py"""
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import empacotar_release as emp  # noqa: E402


class TestEmpacotar(unittest.TestCase):
    def test_pacote_tem_a_estrutura_esperada(self):
        with tempfile.TemporaryDirectory() as t:
            t = Path(t)
            dist = t / "dist"
            (dist / "assets").mkdir(parents=True)
            (dist / "index.html").write_text("<html></html>")
            (dist / "assets" / "a.js").write_text("x")
            itens = emp.lista_arquivos(False, dist)
            nomes = {n for _, n in itens}
            self.assertIn("site/index.html", nomes)
            self.assertIn("site/assets/a.js", nomes)
            self.assertIn("scripts/ifc_db.py", nomes)
            self.assertIn("scripts/export-edition.py", nomes)
            self.assertIn("deploy/instalar_vm.sh", nomes)
            self.assertFalse(any(n.startswith("sqlite/") for n in nomes))
            saida = t / "r" / "p.tar.gz"
            emp.montar_pacote(itens, saida)
            with tarfile.open(saida) as tar:
                sh = tar.getmember("deploy/publicar_site.sh")
                self.assertEqual(sh.mode, 0o755)
                self.assertNotIn(b"\r\n", tar.extractfile(sh).read())

    def test_sem_index_avisa(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(SystemExit):
                emp.lista_arquivos(False, Path(t))

    def test_com_sqlite_sem_arquivo_avisa(self):
        with tempfile.TemporaryDirectory() as t:
            dist = Path(t) / "dist"
            dist.mkdir()
            (dist / "index.html").write_text("x")
            antigo = emp.SQLITE
            emp.SQLITE = Path(t) / "vazio"
            try:
                with self.assertRaises(SystemExit):
                    emp.lista_arquivos(True, dist)
            finally:
                emp.SQLITE = antigo


if __name__ == "__main__":
    unittest.main(verbosity=2)
