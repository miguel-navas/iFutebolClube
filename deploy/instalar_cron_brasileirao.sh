#!/usr/bin/env bash
# Agenda no cron do usuário que rodar este script a atualização do Brasileirão (duas vezes por dia).
# A VM roda em UTC; Brasília = UTC-3: 01:10 e 11:10 de Brasília (04:10 e 14:10 UTC).
set -euo pipefail
APP="${APP:-/opt/ifutebolclube}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
LINHA="10 4,14 * * * bash $AQUI/atualizar_brasileirao.sh >> $APP/logs/brasileirao.log 2>&1"
( crontab -l 2>/dev/null | grep -v "atualizar_brasileirao.sh" || true; echo "$LINHA" ) | crontab -
echo "Cron instalado:"; crontab -l | grep atualizar_brasileirao
