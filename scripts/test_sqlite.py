"""Testes do modo SQLite (adaptador de banco e conversor). Dados inventados, sem SQL Server.
Rode: python scripts/test_sqlite.py

As consultas dos exportadores são conferidas contra as tabelas descritas nos schema.sql dos agentes
(pasta ..\\Agentes ao lado do projeto, ou IFC_AGENTES_DIR); sem a pasta, essa parte é pulada."""
import importlib.util
import os
import re
import sqlite3
import sys
import tempfile
import unittest
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402
import sqlserver_para_sqlite as conv  # noqa: E402


def carregar(nome_arquivo: str):
    spec = importlib.util.spec_from_file_location(nome_arquivo.replace("-", "_"), AQUI / nome_arquivo)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FonteFalsa:
    """Fonte com tabelas e linhas em memória (no lugar do SQL Server)."""

    def __init__(self, tabelas, dados, contagem_errada=None):
        self._tabelas, self._dados, self._errada = tabelas, dados, contagem_errada or {}

    def tabelas(self):
        return self._tabelas

    def linhas(self, t):
        linhas = self._dados[t.nome]
        for i in range(0, len(linhas), 2):
            yield linhas[i : i + 2]

    def contar(self, t):
        return self._errada.get(t.nome, len(self._dados[t.nome]))


def tabela_exemplo():
    return conv.Tabela(
        "dbo",
        "Partidas",
        [
            conv.Coluna("PartidaId", "bigint", False),
            conv.Coluna("Edicao", "int", False),
            conv.Coluna("DataHoraUTC", "datetime2"),
            conv.Coluna("Arbitro", "nvarchar"),
            conv.Coluna("Concluida", "bit", False),
            conv.Coluna("Nota", "decimal"),
            conv.Coluna("Dia", "date"),
        ],
        [conv.Indice("PK_P", True, True, ["PartidaId"]), conv.Indice("IX_Ed", False, False, ["Edicao"])],
    )


DADOS = {
    "Partidas": [
        (1, 2026, datetime(2026, 6, 11, 19, 0, 0), "José Árbitro", True, Decimal("7.50"), date(2026, 6, 11)),
        (2, 2026, None, None, False, None, None),
        (3, 2022, datetime(2022, 11, 20, 16, 0, 0), "Fulano", True, Decimal("3.25"), date(2022, 11, 20)),
    ]
}


class TestTipos(unittest.TestCase):
    def test_mapa_de_tipos(self):
        casos = {"int": "INTEGER", "bit": "BOOLEAN", "decimal": "DECIMAL", "nvarchar": "TEXT", "datetime2": "DATETIME", "date": "DATE", "float": "REAL"}
        for sql, esperado in casos.items():
            self.assertEqual(conv.tipo_sqlite(sql), esperado)
        with self.assertRaises(ValueError):
            conv.tipo_sqlite("geography")

    def test_ddl(self):
        ddl = conv.ddl_tabela(tabela_exemplo())
        self.assertIn('"PartidaId" INTEGER PRIMARY KEY', ddl)
        self.assertIn('"Arbitro" TEXT COLLATE NOCASE', ddl)
        self.assertIn('"Concluida" BOOLEAN NOT NULL', ddl)
        idx = conv.ddl_indices(tabela_exemplo())
        self.assertEqual(len(idx), 1)
        self.assertIn('("Edicao")', idx[0])

    def test_chave_composta(self):
        t = conv.Tabela("dbo", "X", [conv.Coluna("A", "int", False), conv.Coluna("B", "nvarchar", False)], [conv.Indice("PK", True, True, ["A", "B"])])
        self.assertIn('PRIMARY KEY ("A", "B")', conv.ddl_tabela(t))

    def test_nome_destino(self):
        self.assertEqual(conv.nome_destino("dbo", "Jogadores"), "Jogadores")
        self.assertEqual(conv.nome_destino("fifa", "Jogos"), "fifa__Jogos")


class TestDialeto(unittest.TestCase):
    def test_isnull_convert_cast(self):
        self.assertEqual(ifc_db.adaptar_sql("ISNULL(g.Periodo, 0) <> 11"), "IFNULL(g.Periodo, 0) <> 11")
        self.assertEqual(
            ifc_db.adaptar_sql("SELECT CONVERT(varchar(10), fp.Data, 23), x FROM t"),
            "SELECT substr(fp.Data, 1, 10), x FROM t",
        )
        self.assertIn("AS INTEGER", ifc_db.adaptar_sql("SUM(CAST(Publico AS BIGINT))"))

    def test_sem_mudanca_no_resto(self):
        sql = "SELECT COALESCE(a, b) FROM dbo.T WHERE x IN (?, ?) ORDER BY 1"
        self.assertEqual(ifc_db.adaptar_sql(sql), sql)


class TestConversaoEndaEnd(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.arq = Path(self.tmp.name) / "Teste.sqlite"
        self.logs = []
        conv.converter(FonteFalsa([tabela_exemplo()], DADOS), self.arq, "Teste", log=self.logs.append)
        os.environ["IFC_BANCO"] = "sqlite"
        os.environ["IFC_SQLITE_DIR"] = self.tmp.name

    def tearDown(self):
        os.environ.pop("IFC_BANCO", None)
        os.environ.pop("IFC_SQLITE_DIR", None)
        self.tmp.cleanup()

    def test_tipos_voltam_como_no_sql_server(self):
        with ifc_db.abrir("Teste") as conn:
            linhas = conn.cursor().execute("SELECT * FROM dbo.Partidas WHERE Edicao = ? ORDER BY PartidaId", 2026).fetchall()
        self.assertEqual(len(linhas), 2)
        pid, ed, dh, arb, conc, nota, dia = linhas[0]
        self.assertEqual((pid, ed, arb), (1, 2026, "José Árbitro"))
        self.assertIsInstance(dh, datetime)
        self.assertEqual(dh - datetime(2026, 6, 11, 16, 0, 0), datetime(2026, 6, 11, 19, 0) - datetime(2026, 6, 11, 16, 0))
        self.assertIs(conc, True)
        self.assertEqual(nota, Decimal("7.5"))
        self.assertEqual(dia, date(2026, 6, 11))
        self.assertEqual(linhas[1][2:], (None, None, False, None, None))

    def test_funcoes_do_sql_server_traduzidas(self):
        with ifc_db.abrir("Teste") as conn:
            cur = conn.cursor()
            self.assertEqual(cur.execute("SELECT ISNULL(Arbitro, 'sem') FROM dbo.Partidas WHERE PartidaId = 2").fetchone()[0], "sem")
            self.assertEqual(cur.execute("SELECT CONVERT(varchar(10), Dia, 23) FROM dbo.Partidas WHERE PartidaId = 1").fetchone()[0], "2026-06-11")
            r = cur.execute(
                "SELECT Edicao, rn FROM (SELECT Edicao, ROW_NUMBER() OVER (PARTITION BY Edicao ORDER BY PartidaId) AS rn FROM dbo.Partidas) t WHERE rn = 1 ORDER BY Edicao"
            ).fetchall()
            self.assertEqual([x[0] for x in r], [2022, 2026])

    def test_texto_sem_diferenciar_maiusculas(self):
        with ifc_db.abrir("Teste") as conn:
            n = conn.cursor().execute("SELECT COUNT(*) FROM dbo.Partidas WHERE Arbitro = ?", "FULANO").fetchone()[0]
        self.assertEqual(n, 1)

    def test_indices_e_meta(self):
        con = sqlite3.connect(self.arq)
        nomes = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'index'")}
        self.assertTrue(any(n.startswith("ix_Partidas_IX_Ed") for n in nomes))
        self.assertEqual(dict(con.execute("SELECT chave, valor FROM _ifc_meta"))["banco"], "Teste")
        con.close()

    def test_contagem_diferente_aborta_e_nao_deixa_arquivo(self):
        destino = Path(self.tmp.name) / "Outro.sqlite"
        with self.assertRaises(RuntimeError):
            conv.converter(FonteFalsa([tabela_exemplo()], DADOS, {"Partidas": 99}), destino, "Outro", log=lambda *_: None)
        self.assertFalse(destino.exists())
        self.assertFalse(Path(str(destino) + ".tmp").exists())

    def test_arquivo_anterior_so_e_trocado_se_deu_certo(self):
        antes = self.arq.stat().st_size
        with self.assertRaises(RuntimeError):
            conv.converter(FonteFalsa([tabela_exemplo()], DADOS, {"Partidas": 1}), self.arq, "Teste", log=lambda *_: None)
        self.assertEqual(self.arq.stat().st_size, antes)

    def test_arquivo_ausente_da_mensagem_clara(self):
        with self.assertRaises(SystemExit) as e:
            ifc_db.abrir("NaoExiste")
        self.assertIn("sqlserver_para_sqlite", str(e.exception))


# ---------------------------------------------------- consultas dos exportadores x schemas reais
def pasta_agentes():
    p = Path(os.getenv("IFC_AGENTES_DIR") or AQUI.parent.parent / "Agentes")
    return p if p.exists() else None


def ler_tabelas_tsql(arquivo: Path):
    """Lê os CREATE TABLE dbo.X (...) de um schema.sql do SQL Server."""
    texto = arquivo.read_text(encoding="utf-8-sig")
    texto = re.sub(r"--[^\n]*", "", texto)
    texto = re.sub(r"/\*.*?\*/", "", texto, flags=re.S)
    tabelas = []
    for m in re.finditer(r"CREATE TABLE\s+dbo\.(\w+)\s*\((.*?)\n\)\s*;", texto, flags=re.S | re.I):
        cols, fundo, atual = [], 0, ""
        pedacos = []
        for ch in m.group(2):  # separa por vírgula fora de parênteses (há linhas com várias colunas)
            fundo += (ch == "(") - (ch == ")")
            if ch == "," and fundo == 0:
                pedacos.append(atual)
                atual = ""
            else:
                atual += ch
        pedacos.append(atual)
        for pedaco in pedacos:
            linha = " ".join(pedaco.split())
            mm = re.match(r"(\w+)\s+([A-Za-z0-9]+)", linha)
            if not mm or mm.group(1).upper() in ("CONSTRAINT", "PRIMARY", "UNIQUE", "FOREIGN"):
                continue
            cols.append(conv.Coluna(mm.group(1), mm.group(2).lower(), "NOT NULL" not in linha.upper()))
        if cols:
            tabelas.append(conv.Tabela("dbo", m.group(1), cols))
    return tabelas


VIEWS = {  # colunas das views usadas pelos exportadores
    "vw_Campeoes": ["Edicao", "Sede", "Campeao", "Vice", "Partidas", "Selecoes", "Gols"],
    "vw_ArtilhariaPorEdicao": ["Edicao", "Jogador", "Selecao", "Gols"],
}


@unittest.skipUnless(pasta_agentes(), "pasta Agentes não encontrada (defina IFC_AGENTES_DIR)")
class TestConsultasDosExportadores(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        tabelas = []
        for sub in ("copa-do-mundo-2026", "fifa-jogos", "fifa-estatisticas", "copa-jogadores"):
            arq = pasta_agentes() / sub / "schema.sql"
            if arq.exists():
                tabelas += ler_tabelas_tsql(arq)
        for nome, cols in VIEWS.items():
            tabelas.append(conv.Tabela("dbo", nome, [conv.Coluna(c, "nvarchar") for c in cols], view=True))
        dados = {t.nome: [] for t in tabelas}
        conv.converter(FonteFalsa(tabelas, dados), Path(cls.tmp.name) / "CopaDoMundo.sqlite", "CopaDoMundo", log=lambda *_: None)
        cls.tabelas = {t.nome for t in tabelas}
        os.environ["IFC_BANCO"] = "sqlite"
        os.environ["IFC_SQLITE_DIR"] = cls.tmp.name

    @classmethod
    def tearDownClass(cls):
        os.environ.pop("IFC_BANCO", None)
        os.environ.pop("IFC_SQLITE_DIR", None)
        cls.tmp.cleanup()

    def conferir(self, modulo):
        consultas = {n: v for n, v in vars(modulo).items() if n.startswith("SQL_") and isinstance(v, str)}
        self.assertGreater(len(consultas), 3)
        with ifc_db.abrir("CopaDoMundo") as conn:
            for nome, sql in consultas.items():
                with self.subTest(consulta=nome):
                    params = (0,) * sql.count("?")
                    # EXPLAIN valida a sintaxe, as tabelas e as colunas sem precisar de dados
                    conn.cursor().execute("EXPLAIN " + sql, *params).fetchall()

    def test_export_edition(self):
        self.conferir(carregar("export-edition.py"))

    def test_export_stats(self):
        self.conferir(carregar("export-stats.py"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
