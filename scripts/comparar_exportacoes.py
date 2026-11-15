"""Confere se exportar pelo SQLite dá o mesmo resultado que exportar pelo SQL Server.

Rode no PC, depois de gerar o arquivo SQLite (converter-para-sqlite.bat):

    python scripts/comparar_exportacoes.py            # edição 2026
    python scripts/comparar_exportacoes.py 2022

Roda export-stats.py e export-edition.py duas vezes (IFC_BANCO=sqlserver e IFC_BANCO=sqlite), cada uma
numa pasta temporária (o site não é tocado) e compara todos os arquivos JSON, ignorando a hora de geração.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
IGNORAR = {"generatedAt"}


def rodar(modo: str, saida: Path, edicao: str) -> None:
    env = dict(os.environ, IFC_BANCO=modo, IFC_SAIDA_DIR=str(saida), PYTHONIOENCODING="utf-8")
    for script, args in (("export-stats.py", []), ("export-edition.py", [edicao])):
        r = subprocess.run([sys.executable, str(AQUI / script), *args], env=env, capture_output=True, text=True, encoding="utf-8")
        if r.returncode != 0:
            raise SystemExit(f"{script} falhou no modo {modo}:\n{r.stdout}\n{r.stderr}")


def diferencas(a, b, caminho="") -> list[str]:
    if isinstance(a, dict) and isinstance(b, dict):
        saida = []
        for k in sorted(set(a) | set(b)):
            if k in IGNORAR:
                continue
            if k not in a:
                saida.append(f"{caminho}/{k}: só no SQLite")
            elif k not in b:
                saida.append(f"{caminho}/{k}: só no SQL Server")
            else:
                saida += diferencas(a[k], b[k], f"{caminho}/{k}")
        return saida
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return [f"{caminho}: {len(a)} itens no SQL Server, {len(b)} no SQLite"]
        saida = []
        for i, (x, y) in enumerate(zip(a, b)):
            saida += diferencas(x, y, f"{caminho}[{i}]")
        return saida
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
        return [] if abs(a - b) < 1e-9 else [f"{caminho}: {a} (SQL Server) x {b} (SQLite)"]
    return [] if a == b else [f"{caminho}: {a!r} (SQL Server) x {b!r} (SQLite)"]


def comparar(pasta_a: Path, pasta_b: Path) -> tuple[int, list[str]]:
    arqs_a = {p.relative_to(pasta_a) for p in pasta_a.rglob("*.json")}
    arqs_b = {p.relative_to(pasta_b) for p in pasta_b.rglob("*.json")}
    problemas = [f"{p}: só no SQL Server" for p in sorted(arqs_a - arqs_b)]
    problemas += [f"{p}: só no SQLite" for p in sorted(arqs_b - arqs_a)]
    for p in sorted(arqs_a & arqs_b):
        a = json.loads((pasta_a / p).read_text(encoding="utf-8"))
        b = json.loads((pasta_b / p).read_text(encoding="utf-8"))
        problemas += [f"{p}{d}" for d in diferencas(a, b)]
    return len(arqs_a & arqs_b), problemas


def main() -> int:
    edicao = sys.argv[1] if len(sys.argv) > 1 else "2026"
    with tempfile.TemporaryDirectory() as tmp:
        a, b = Path(tmp) / "sqlserver", Path(tmp) / "sqlite"
        for modo, pasta in (("sqlserver", a), ("sqlite", b)):
            print(f"Exportando pelo {modo}...")
            rodar(modo, pasta, edicao)
        n, problemas = comparar(a, b)
    if not problemas:
        print(f"IGUAIS: {n} arquivos JSON idênticos nos dois modos.")
        return 0
    print(f"{len(problemas)} diferença(s) em {n} arquivos. As primeiras:")
    for d in problemas[:40]:
        print("  -", d)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
