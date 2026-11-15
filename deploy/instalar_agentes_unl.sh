#!/usr/bin/env bash
# Instala na VM os agentes da Nations League (gravam em SQLite) e agenda no cron do usuário que rodar este script.
#
#   bash instalar_agentes_unl.sh agentes-unl-AAAAMMDD.tar.gz
#
# Horários: agente de dados às 22:00 e 00:30 de Brasília; perfis às 02:30 de Brasília. Não mexe nos outros sites. Cria só /opt/ifutebolclube/agentes e acrescenta três linhas ao crontab.
set -euo pipefail
PACOTE="${1:-}"
APP="${APP:-/opt/ifutebolclube}"
[ -f "$PACOTE" ] || { echo "Uso: bash $0 PACOTE.tar.gz" >&2; exit 2; }

sudo mkdir -p "$APP/agentes" "$APP/scripts" "$APP/data/sqlite" "$APP/logs"
sudo chown -R "$USER":"$USER" "$APP"
tar -xzf "$PACOTE" -C "$APP"
chmod +x "$APP/scripts/atualizar_nations_league.sh"
sed -i 's/\r$//' "$APP/scripts/atualizar_nations_league.sh"

if [ ! -x "$APP/.venv/bin/python" ]; then
  sudo apt-get install -y -qq python3-venv >/dev/null
  python3 -m venv "$APP/.venv"
fi
"$APP/.venv/bin/pip" install -q requests python-dotenv

# cron (a VM roda em UTC; Brasília = UTC-3): agente de dados todo dia às 22:00 e às 00:30 de Brasília (01:00 e 03:30 UTC); perfis da Wikipédia às 02:30 de Brasília
LINHA1="0 1 * * * $APP/scripts/atualizar_nations_league.sh >> $APP/logs/nations_league.log 2>&1"
LINHA1B="30 3 * * * $APP/scripts/atualizar_nations_league.sh >> $APP/logs/nations_league.log 2>&1"
LINHA2="30 5 * * * $APP/scripts/atualizar_nations_league.sh perfis >> $APP/logs/nations_league_perfis.log 2>&1"
( crontab -l 2>/dev/null | grep -v "atualizar_nations_league.sh" || true; echo "$LINHA1"; echo "$LINHA1B"; echo "$LINHA2" ) | crontab -
echo "Cron instalado:"; crontab -l | grep atualizar_nations_league

echo "Primeira carga (completa) em segundo plano; acompanhe com: tail -f $APP/logs/nations_league_inicial.log"
nohup bash -c "$APP/scripts/atualizar_nations_league.sh completo && $APP/scripts/atualizar_nations_league.sh perfis" \
  > "$APP/logs/nations_league_inicial.log" 2>&1 &
