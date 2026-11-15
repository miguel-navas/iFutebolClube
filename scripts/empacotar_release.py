"""Monta o pacote para publicar o iFutebolClube na VM.

Rode no PC, na pasta do projeto:

    python scripts/empacotar_release.py                 # build do site + exportadores
    python scripts/empacotar_release.py --com-sqlite    # leva também data/sqlite/*.sqlite
    python scripts/empacotar_release.py --sem-build     # reaproveita app/frontend/dist já pronto

Gera release/ifutebolclube-AAAAMMDD-HHMMSS.tar.gz com:
    site/      build do frontend (dist), incluindo public/data (editions, stats, mapa)
    scripts/   exportadores (ifc_db.py, export-edition.py, export-stats.py, next-edition.json) e atualizar_dados.sh
    sqlite/    arquivos .sqlite (só com --com-sqlite)
    deploy/    instalar_vm.sh, publicar_site.sh e a configuração do nginx
Na VM: `bash publicar_site.sh PACOTE.tar.gz --com-dados` (veja deploy/README.md).
"""
from __future__ import annotations

import argparse
import io
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FRONT = RAIZ / "app" / "frontend"
SCRIPTS = RAIZ / "scripts"
DEPLOY = RAIZ / "deploy"
SQLITE = RAIZ / "data" / "sqlite"

EXPORTADORES = ["export-nations-league.py", "ifc_db.py", "export-edition.py", "export-stats.py", "next-edition.json",
                "export-probabilidades-nl.py", "export-probabilidades.py", "historico.py", "modelo_probabilidades.py", "export-comparacao.py"]
HISTORICO = RAIZ / "data" / "historico" / "results.csv"


def lista_arquivos(com_sqlite: bool, dist: Path) -> list[tuple[Path, str]]:
    """(arquivo no disco, caminho dentro do pacote)."""
    itens: list[tuple[Path, str]] = []
    if not (dist / "index.html").exists():
        raise SystemExit(f"{dist} não tem index.html: rode sem --sem-build")
    for p in sorted(dist.rglob("*")):
        if p.is_file():
            itens.append((p, "site/" + p.relative_to(dist).as_posix()))
    for nome in EXPORTADORES:
        p = SCRIPTS / nome
        if p.exists():
            itens.append((p, f"scripts/{nome}"))
        elif nome != "next-edition.json":
            raise SystemExit(f"Faltou {p}")
    atualizar = DEPLOY / "atualizar_dados.sh"
    if atualizar.exists():
        itens.append((atualizar, "scripts/atualizar_dados.sh"))
    for p in sorted(DEPLOY.glob("*")):
        if p.is_file():
            itens.append((p, f"deploy/{p.name}"))
    for p in (HISTORICO, HISTORICO.with_name("selecoes.json"), HISTORICO.with_name("copa_detalhes.json"), HISTORICO.with_name("goalscorers.csv"), HISTORICO.with_name("copa_estatisticas.json")):
        if p.exists():
            itens.append((p, f"historico/{p.name}"))
    if com_sqlite:
        arquivos = sorted(SQLITE.glob("*.sqlite"))
        if not arquivos:
            raise SystemExit(f"Nenhum .sqlite em {SQLITE}: rode converter-para-sqlite.bat antes")
        itens += [(p, f"sqlite/{p.name}") for p in arquivos]
    return itens


def montar_pacote(itens: list[tuple[Path, str]], destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(destino, "w:gz") as tar:
        for arq, nome in itens:
            info = tar.gettarinfo(str(arq), arcname=nome)
            info.uid = info.gid = 0
            info.uname = info.gname = "root"
            info.mode = 0o755 if nome.endswith(".sh") else 0o644
            if nome.endswith(".sh"):
                # scripts de shell precisam de fim de linha Unix, mesmo se o arquivo veio do Windows
                dados = arq.read_bytes().replace(b"\r\n", b"\n")
                info.size = len(dados)
                tar.addfile(info, io.BytesIO(dados))
            else:
                with arq.open("rb") as f:
                    tar.addfile(info, f)


def construir_site() -> None:
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        raise SystemExit("npm não encontrado: instale o Node.js ou use --sem-build")
    r = subprocess.run([npm, "run", "build"], cwd=FRONT)
    if r.returncode != 0:
        raise SystemExit("O build do site falhou")


def main() -> int:
    ap = argparse.ArgumentParser(description="Empacota o iFutebolClube para a VM")
    ap.add_argument("--com-sqlite", action="store_true", help="inclui data/sqlite/*.sqlite")
    ap.add_argument("--sem-build", action="store_true", help="não roda o build do site")
    args = ap.parse_args()

    if not args.sem_build:
        construir_site()
    itens = lista_arquivos(args.com_sqlite, FRONT / "dist")
    destino = RAIZ / "release" / f"ifutebolclube-{datetime.now():%Y%m%d-%H%M%S}.tar.gz"
    montar_pacote(itens, destino)
    mb = destino.stat().st_size / 1e6
    print(f"{len(itens)} arquivos, {mb:.1f} MB: {destino}")
    print("Envie para a VM e rode: bash publicar_site.sh PACOTE.tar.gz --com-dados  (veja deploy/README.md)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
