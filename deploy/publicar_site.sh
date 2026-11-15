#!/usr/bin/env bash
# Publica uma versão do site na VM: troca o link `current` de uma vez (sem ficar fora do ar).
#
#   bash publicar_site.sh ifutebolclube-20261105-1700.tar.gz [--com-dados]
#
# O pacote é feito no PC por scripts/empacotar_release.py. Sem --com-dados os JSON em /data (editions,
# stats) não são tocados, porque quem os atualiza são os exportadores da VM. Use --com-dados na
# primeira publicação, para levar os dados que já existem no PC.
set -euo pipefail

SITE="${SITE:-/var/www/ifutebolclube}"
APP="${APP:-/opt/ifutebolclube}"
PACOTE="${1:-}"
COM_DADOS=0
[ "${2:-}" = "--com-dados" ] && COM_DADOS=1

if [ -z "$PACOTE" ] || [ ! -f "$PACOTE" ]; then
  echo "Uso: bash publicar_site.sh PACOTE.tar.gz [--com-dados]" >&2
  exit 2
fi

TS="$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar -xzf "$PACOTE" -C "$TMP"
[ -f "$TMP/site/index.html" ] || { echo "Pacote inválido: não tem site/index.html" >&2; exit 1; }

DEST="$SITE/releases/$TS"
mkdir -p "$DEST" "$SITE/data"
rsync -a --exclude '/data' "$TMP/site/" "$DEST/"

# Arquivos de dados fixos do site (mapa etc.) sempre acompanham a versão; editions/stats só com --com-dados.
if [ -d "$TMP/site/data" ]; then
  rsync -a --exclude 'editions/' --exclude 'stats/' "$TMP/site/data/" "$SITE/data/"
  if [ "$COM_DADOS" -eq 1 ]; then
    rsync -a "$TMP/site/data/" "$SITE/data/"
    echo "Dados do pacote copiados para $SITE/data"
  fi
fi

# Exportadores e SQLite, se vieram no pacote.
if [ -d "$TMP/scripts" ]; then
  mkdir -p "$APP/scripts"
  rsync -a "$TMP/scripts/" "$APP/scripts/"
fi
if [ -d "$TMP/historico" ]; then
  mkdir -p "$APP/data/historico"
  rsync -a "$TMP/historico/" "$APP/data/historico/"
fi
if [ -d "$TMP/sqlite" ]; then
  mkdir -p "$APP/data/sqlite" "$APP/data/sqlite-backup"
  # Guarda uma cópia do banco que está na VM antes de trocar (os agentes da VM podem ter dados mais novos).
  for f in "$APP"/data/sqlite/*.sqlite; do
    [ -e "$f" ] && cp -p "$f" "$APP/data/sqlite-backup/$(basename "$f").$TS"
  done
  ls -1t "$APP"/data/sqlite-backup/* 2>/dev/null | tail -n +7 | xargs -r rm -f
  rsync -a "$TMP/sqlite/" "$APP/data/sqlite/"
  echo "SQLite atualizado em $APP/data/sqlite"
fi

ln -sfn "$DEST" "$SITE/current"
echo "Publicado: $DEST"

# Guarda as 4 versões mais recentes.
ls -1dt "$SITE"/releases/*/ | tail -n +5 | xargs -r rm -rf
