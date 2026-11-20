#!/usr/bin/env bash
# Roda na VM (pelo cron). Baixa a tabela do Brasileirão Série A (openfootball) e regera o JSON do site.
set -euo pipefail

APP="${APP:-/opt/ifutebolclube}"
export IFC_BANCO=sqlite
export IFC_SQLITE_DIR="${IFC_SQLITE_DIR:-$APP/data/sqlite}"
export IFC_SAIDA_DIR="${IFC_SAIDA_DIR:-${SITE:-/var/www/ifutebolclube}/data}"
PY="$APP/.venv/bin/python"

mkdir -p "$APP/logs" "$APP/data/openfootball"
exec 9>"$APP/logs/brasileirao.lock"
flock -n 9 || { echo "$(date -Is) já está rodando; saindo"; exit 0; }

echo "$(date -Is) início"
"$PY" "$APP/scripts/export-brasileirao.py"
echo "$(date -Is) fim"
