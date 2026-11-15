"""Acesso ao banco para os exportadores do iFutebolClube.

Dois modos, escolhidos pela variável de ambiente IFC_BANCO:
  sqlserver  (padrão)  usa o SQL Server do PC, como sempre.
  sqlite               lê o arquivo gerado por sqlserver_para_sqlite.py (ou gravado pelos agentes na VM).

No modo sqlite os arquivos ficam em IFC_SQLITE_DIR (padrão: <projeto>/data/sqlite), um por banco:
CopaDoMundo.sqlite, etc. O arquivo é aberto como `dbo`, então as consultas continuam escritas com
`dbo.Tabela`, e `adaptar_sql` troca as poucas funções que só existem no SQL Server.
Os tipos voltam como no SQL Server (datetime, date, bool, Decimal), pelas colunas declaradas.
"""
from __future__ import annotations

import importlib.util
import os
import re
import sqlite3
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent

MODOS = ("sqlserver", "sqlite")


def modo() -> str:
    m = (os.getenv("IFC_BANCO") or "sqlserver").strip().lower()
    if m not in MODOS:
        raise SystemExit(f"IFC_BANCO inválido: {m!r} (use sqlserver ou sqlite)")
    return m


def pasta_sqlite() -> Path:
    return Path(os.getenv("IFC_SQLITE_DIR") or RAIZ / "data" / "sqlite")


def caminho_sqlite(nome_bd: str) -> Path:
    return pasta_sqlite() / f"{nome_bd}.sqlite"


def pasta_saida_dados() -> Path:
    """Pasta `public/data` do site (IFC_SAIDA_DIR troca o destino, útil para comparar exportações)."""
    return Path(os.getenv("IFC_SAIDA_DIR") or RAIZ / "app" / "frontend" / "public" / "data")


# ----------------------------------------------------------------- tipos
def _texto(b: bytes) -> str:
    return b.decode("utf-8")


def _conv_datetime(b: bytes) -> datetime:
    return datetime.fromisoformat(_texto(b).replace("Z", ""))


def _conv_date(b: bytes) -> date:
    return date.fromisoformat(_texto(b)[:10])


def _conv_time(b: bytes) -> time:
    return time.fromisoformat(_texto(b))


def _conv_bool(b: bytes) -> bool:
    return _texto(b) not in ("0", "")


def _conv_decimal(b: bytes) -> Decimal:
    return Decimal(_texto(b))


# Os nomes são os tipos declarados nas colunas pelo conversor.
sqlite3.register_converter("DATETIME", _conv_datetime)
sqlite3.register_converter("DATE", _conv_date)
sqlite3.register_converter("TIME", _conv_time)
sqlite3.register_converter("BOOLEAN", _conv_bool)
sqlite3.register_converter("DECIMAL", _conv_decimal)


def valor_para_sqlite(v):
    """Valor lido do SQL Server -> valor que o SQLite guarda."""
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, datetime):
        return v.isoformat(sep=" ")
    if isinstance(v, (date, time)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return str(v)
    if isinstance(v, (bytearray, memoryview)):
        return bytes(v)
    return v


# ------------------------------------------------------------ dialeto SQL
_RE_ISNULL = re.compile(r"\bISNULL\s*\(", re.IGNORECASE)
_RE_CONVERT_DATA = re.compile(r"\bCONVERT\s*\(\s*varchar\s*\(\s*10\s*\)\s*,\s*([^,()]+?)\s*,\s*23\s*\)", re.IGNORECASE)
_RE_CAST_BIGINT = re.compile(r"\bAS\s+BIGINT\b", re.IGNORECASE)


def adaptar_sql(sql: str) -> str:
    """Troca o que o SQLite não tem. O resto (JOIN, UNION, ROW_NUMBER, COALESCE, LIKE) já funciona igual."""
    sql = _RE_ISNULL.sub("IFNULL(", sql)
    sql = _RE_CONVERT_DATA.sub(r"substr(\1, 1, 10)", sql)
    sql = _RE_CAST_BIGINT.sub("AS INTEGER", sql)
    return sql


class _Cursor:
    """Cursor no estilo do pyodbc: execute(sql, *parametros) devolve o próprio cursor."""

    def __init__(self, conn: sqlite3.Connection):
        self._cur = conn.cursor()

    def execute(self, sql: str, *params):
        if len(params) == 1 and isinstance(params[0], (list, tuple)):
            params = tuple(params[0])
        self._cur.execute(adaptar_sql(sql), params)
        return self

    def fetchall(self):
        return self._cur.fetchall()

    def fetchone(self):
        return self._cur.fetchone()

    def fetchmany(self, n=None):
        return self._cur.fetchmany(n) if n else self._cur.fetchmany()

    def __iter__(self):
        return iter(self._cur)


class ConexaoSqlite:
    """Conexão somente leitura que imita o que os exportadores usam do pyodbc."""

    def __init__(self, arquivo: Path):
        if not Path(arquivo).exists():
            raise SystemExit(
                f"Arquivo SQLite não encontrado: {arquivo}\n"
                "Gere com sqlserver_para_sqlite.py (no PC) ou rode os agentes com destino SQLite."
            )
        self.arquivo = Path(arquivo)
        # Banco em memória como principal e o arquivo anexado como `dbo`: assim `dbo.Tabela` funciona.
        self._conn = sqlite3.connect(":memory:", detect_types=sqlite3.PARSE_DECLTYPES, uri=True)
        self._conn.execute("ATTACH DATABASE ? AS dbo", (f"{self.arquivo.resolve().as_uri()}?mode=ro",))

    def cursor(self) -> _Cursor:
        return _Cursor(self._conn)

    def close(self) -> None:
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
        return False


# ------------------------------------------------------------ abrir
def _comum():
    """Reaproveita a leitura do .env e a string de conexão do export-stats.py."""
    spec = importlib.util.spec_from_file_location("export_stats", AQUI / "export-stats.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def abrir(nome_bd: str):
    """Conexão com o banco `nome_bd` no modo escolhido; use com `with`."""
    if modo() == "sqlite":
        return ConexaoSqlite(caminho_sqlite(nome_bd))
    import pyodbc

    comum = _comum()
    comum.carregar_env()
    return pyodbc.connect(comum._conn_str(nome_bd))


def erros_banco() -> tuple:
    """Exceções de banco do modo atual, para `except ifc_db.erros_banco():`."""
    if modo() == "sqlite":
        return (sqlite3.Error,)
    import pyodbc

    return (pyodbc.Error,)
