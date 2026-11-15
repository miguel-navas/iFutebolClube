#!/usr/bin/env bash
# Gera de novo os JSON do site a partir do SQLite e publica em /var/www/ifutebolclube/data.
# Roda na VM, à mão ou pelo cron:
#
#   0 * * * *  /opt/ifutebolclube/scripts/atualizar_dados.sh >> /opt/ifutebolclube/logs/dados.log 2>&1
#
# EDICAO (padrão 2026) e IFC_SQLITE_DIR podem ser trocados por variáveis de ambiente.
set -euo pipefail

APP="${APP:-/opt/ifutebolclube}"
export IFC_BANCO=sqlite
export IFC_SQLITE_DIR="${IFC_SQLITE_DIR:-$APP/data/sqlite}"
export IFC_SAIDA_DIR="${IFC_SAIDA_DIR:-${SITE:-/var/www/ifutebolclube}/data}"
EDICAO="${EDICAO:-2026}"
PY="$APP/.venv/bin/python"

# Só uma execução por vez.
exec 9>"$APP/logs/atualizar.lock"
flock -n 9 || { echo "$(date -Is) já está rodando; saindo"; exit 0; }

echo "$(date -Is) início (edição $EDICAO)"
"$PY" "$APP/scripts/export-stats.py"
"$PY" "$APP/scripts/export-edition.py" "$EDICAO"
echo "$(date -Is) fim"
