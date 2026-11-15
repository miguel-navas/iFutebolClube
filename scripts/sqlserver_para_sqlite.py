"""Copia um banco do SQL Server para um arquivo SQLite (tabelas, views, chaves e índices).

Rode no PC que tem o SQL Server, na pasta do projeto:

    python scripts/sqlserver_para_sqlite.py                    # banco da Copa (CopaDoMundo)
    python scripts/sqlserver_para_sqlite.py --bd CopaDoMundo --bd EuroCopa
    python scripts/sqlserver_para_sqlite.py --saida D:\\dados

Gera um arquivo por banco em data/sqlite (ou na pasta de --saida): CopaDoMundo.sqlite etc.
O arquivo é escrito num nome temporário e só substitui o anterior quando termina e a contagem de
linhas de cada tabela confere com a origem. Views viram tabelas com o resultado de hoje.
A conexão é a mesma dos exportadores (veja export-stats.py).
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ifc_db  # noqa: E402

LOTE = 5000

# tipo do SQL Server -> tipo declarado no SQLite. Os nomes DATETIME, DATE, TIME, BOOLEAN e DECIMAL são
# lidos de volta como datetime, date, time, bool e Decimal pelo ifc_db (conversores registrados).
TIPOS = {
    "tinyint": "INTEGER", "smallint": "INTEGER", "int": "INTEGER", "bigint": "INTEGER",
    "bit": "BOOLEAN",
    "decimal": "DECIMAL", "numeric": "DECIMAL", "money": "DECIMAL", "smallmoney": "DECIMAL",
    "float": "REAL", "real": "REAL",
    "char": "TEXT", "varchar": "TEXT", "nchar": "TEXT", "nvarchar": "TEXT", "text": "TEXT", "ntext": "TEXT",
    "uniqueidentifier": "TEXT", "xml": "TEXT", "sysname": "TEXT",
    "date": "DATE", "time": "TIME",
    "datetime": "DATETIME", "datetime2": "DATETIME", "smalldatetime": "DATETIME", "datetimeoffset": "DATETIME",
    "binary": "BLOB", "varbinary": "BLOB", "image": "BLOB", "timestamp": "BLOB", "rowversion": "BLOB",
}


def tipo_sqlite(tipo_sql: str) -> str:
    t = TIPOS.get((tipo_sql or "").lower())
    if t is None:
        raise ValueError(f"tipo do SQL Server sem equivalente: {tipo_sql}")
    return t


def nome_destino(esquema: str, tabela: str) -> str:
    """dbo.Jogadores -> Jogadores; outros esquemas ganham prefixo (esquema__Tabela)."""
    return tabela if esquema.lower() == "dbo" else f"{esquema}__{tabela}"


def aspas(nome: str) -> str:
    return '"' + nome.replace('"', '""') + '"'


@dataclass
class Coluna:
    nome: str
    tipo: str  # tipo do SQL Server
    anulavel: bool = True
    identidade: bool = False


@dataclass
class Indice:
    nome: str
    unico: bool
    primario: bool
    colunas: list[str] = field(default_factory=list)


@dataclass
class Tabela:
    esquema: str
    nome: str
    colunas: list[Coluna]
    indices: list[Indice] = field(default_factory=list)
    view: bool = False

    @property
    def destino(self) -> str:
        return nome_destino(self.esquema, self.nome)


def ddl_tabela(t: Tabela) -> str:
    pk = next((i for i in t.indices if i.primario), None)
    # chave de uma coluna inteira vira rowid (INTEGER PRIMARY KEY), como a identidade do SQL Server
    pk_simples = None
    if pk and len(pk.colunas) == 1:
        c = next(c for c in t.colunas if c.nome == pk.colunas[0])
        if tipo_sqlite(c.tipo) == "INTEGER":
            pk_simples = c.nome
    linhas = []
    for c in t.colunas:
        tipo = tipo_sqlite(c.tipo)
        partes = [aspas(c.nome), tipo]
        if tipo == "TEXT":
            partes.append("COLLATE NOCASE")  # o SQL Server compara texto sem diferenciar maiúsculas
        if c.nome == pk_simples:
            partes.append("PRIMARY KEY")
        elif not c.anulavel:
            partes.append("NOT NULL")
        linhas.append(" ".join(partes))
    if pk and not pk_simples:
        linhas.append("PRIMARY KEY (" + ", ".join(aspas(x) for x in pk.colunas) + ")")
    return f"CREATE TABLE {aspas(t.destino)} (\n  " + ",\n  ".join(linhas) + "\n)"


def ddl_indices(t: Tabela) -> list[str]:
    saida = []
    for i in t.indices:
        if i.primario or not i.colunas:
            continue
        nome = aspas(f"ix_{t.destino}_{i.nome}")
        unico = "UNIQUE " if i.unico else ""
        cols = ", ".join(aspas(c) for c in i.colunas)
        saida.append(f"CREATE {unico}INDEX {nome} ON {aspas(t.destino)} ({cols})")
    return saida


def sql_insercao(t: Tabela) -> str:
    return (
        f"INSERT INTO {aspas(t.destino)} ({', '.join(aspas(c.nome) for c in t.colunas)}) "
        f"VALUES ({', '.join('?' * len(t.colunas))})"
    )


# ----------------------------------------------------------------- origem
class FonteSqlServer:
    """Lê a estrutura e as linhas de um banco do SQL Server."""

    def __init__(self, conn):
        self.conn = conn

    def tabelas(self) -> list[Tabela]:
        cur = self.conn.cursor()
        base = cur.execute(
            "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES "
            "WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA') ORDER BY TABLE_SCHEMA, TABLE_NAME"
        ).fetchall()
        cols = {}
        for esq, tab, nome, tipo, nulo, ident in cur.execute(
            "SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, "
            "COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsIdentity') "
            "FROM INFORMATION_SCHEMA.COLUMNS c ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION"
        ).fetchall():
            cols.setdefault((esq, tab), []).append(Coluna(nome, tipo, nulo == "YES", bool(ident)))
        indices: dict = {}
        for esq, tab, ind, unico, prim, col in cur.execute(
            "SELECT s.name, t.name, i.name, i.is_unique, i.is_primary_key, c.name "
            "FROM sys.indexes i "
            "JOIN sys.tables t ON t.object_id = i.object_id JOIN sys.schemas s ON s.schema_id = t.schema_id "
            "JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0 "
            "JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id "
            "WHERE i.type > 0 ORDER BY s.name, t.name, i.index_id, ic.key_ordinal"
        ).fetchall():
            lista = indices.setdefault((esq, tab), {})
            lista.setdefault(ind, Indice(ind, bool(unico), bool(prim))).colunas.append(col)
        return [
            Tabela(esq, tab, cols.get((esq, tab), []), list(indices.get((esq, tab), {}).values()), tipo == "VIEW")
            for esq, tab, tipo in base
            if cols.get((esq, tab))
        ]

    def linhas(self, t: Tabela):
        cur = self.conn.cursor()
        cur.execute(f"SELECT {', '.join('[' + c.nome + ']' for c in t.colunas)} FROM [{t.esquema}].[{t.nome}]")
        while True:
            lote = cur.fetchmany(LOTE)
            if not lote:
                return
            yield lote

    def contar(self, t: Tabela) -> int:
        return self.conn.cursor().execute(f"SELECT COUNT(*) FROM [{t.esquema}].[{t.nome}]").fetchone()[0]


# ------------------------------------------------------------ conversão
def converter(fonte, destino: Path, nome_bd: str, log=print) -> dict:
    """Copia tudo da `fonte` para `destino` (.sqlite). Devolve um resumo; levanta RuntimeError se a contagem não conferir."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    temp = destino.with_name(destino.name + ".tmp")
    if temp.exists():
        temp.unlink()
    tabelas = fonte.tabelas()
    resumo = {"banco": nome_bd, "tabelas": {}, "views": []}
    con = sqlite3.connect(temp)
    try:
        con.execute("PRAGMA journal_mode = OFF")
        con.execute("PRAGMA synchronous = OFF")
        for t in tabelas:
            con.execute(ddl_tabela(t))
            total = 0
            ins = sql_insercao(t)
            for lote in fonte.linhas(t):
                con.executemany(ins, [tuple(ifc_db.valor_para_sqlite(v) for v in linha) for linha in lote])
                total += len(lote)
            if not t.view:
                for d in ddl_indices(t):
                    con.execute(d)
            else:
                resumo["views"].append(t.destino)
            esperado = fonte.contar(t)
            resumo["tabelas"][t.destino] = total
            marca = " (view)" if t.view else ""
            log(f"  {t.destino}{marca}: {total} linhas")
            if total != esperado:
                raise RuntimeError(f"{t.destino}: copiei {total} linhas mas a origem tem {esperado}")
        con.execute("CREATE TABLE _ifc_meta (chave TEXT PRIMARY KEY, valor TEXT)")
        agora = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        con.executemany(
            "INSERT INTO _ifc_meta VALUES (?, ?)",
            [("origem", "sqlserver"), ("banco", nome_bd), ("gerado_em", agora)],
        )
        con.commit()
        con.execute("ANALYZE")
        con.commit()
    except BaseException:
        con.close()
        if temp.exists():
            temp.unlink()
        raise
    con.close()
    os.replace(temp, destino)
    resumo["bytes"] = destino.stat().st_size
    return resumo


def main() -> int:
    ap = argparse.ArgumentParser(description="Copia bancos do SQL Server para arquivos SQLite")
    ap.add_argument("--bd", action="append", help="banco a copiar (pode repetir); padrão: SQL_DATABASE_COPA ou CopaDoMundo")
    ap.add_argument("--saida", help="pasta de destino (padrão: IFC_SQLITE_DIR ou data/sqlite)")
    args = ap.parse_args()

    comum = ifc_db._comum()
    comum.carregar_env()
    bancos = args.bd or [os.getenv("SQL_DATABASE_COPA", "CopaDoMundo")]
    pasta = Path(args.saida) if args.saida else ifc_db.pasta_sqlite()
    import pyodbc

    codigo = 0
    for nome in bancos:
        print(f"Banco {nome}:")
        try:
            with pyodbc.connect(comum._conn_str(nome)) as conn:
                r = converter(FonteSqlServer(conn), pasta / f"{nome}.sqlite", nome)
        except (pyodbc.Error, RuntimeError, ValueError) as e:
            print(f"ERRO em {nome}: {e}", file=sys.stderr)
            codigo = 1
            continue
        linhas = sum(r["tabelas"].values())
        print(f"{len(r['tabelas'])} tabelas ({len(r['views'])} vindas de views), {linhas} linhas, {r['bytes'] / 1e6:.1f} MB em {pasta / (nome + '.sqlite')}")
    return codigo


if __name__ == "__main__":
    raise SystemExit(main())
