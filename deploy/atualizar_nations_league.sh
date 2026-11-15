#!/usr/bin/env bash
# Roda na VM (pelo cron). Atualiza a Nations League: coleta na UEFA (agente), grava no SQLite e regera os JSON do site.
#
#   atualizar_nations_league.sh            agente de dados (só acessa a UEFA se houver jogo para atualizar) + exportação
#   atualizar_nations_league.sh perfis     agente de perfis da Wikipédia (clubes, jogos e gols pela seleção) + exportação
#   atualizar_nations_league.sh completo   recarrega tudo da UEFA do zero + exportação
set -euo pipefail

APP="${APP:-/opt/ifutebolclube}"
export IFC_BANCO=sqlite
export IFC_SQLITE_DIR="${IFC_SQLITE_DIR:-$APP/data/sqlite}"
export IFC_SAIDA_DIR="${IFC_SAIDA_DIR:-${SITE:-/var/www/ifutebolclube}/data}"
PY="$APP/.venv/bin/python"

mkdir -p "$APP/logs"
exec 9>"$APP/logs/nations_league.lock"
flock -n 9 || { echo "$(date -Is) já está rodando; saindo"; exit 0; }

echo "$(date -Is) início (${1:-agente})"
case "${1:-agente}" in
  agente)   "$PY" "$APP/agentes/uefa-nations-league/agente_unl.py" ;;
  completo) "$PY" "$APP/agentes/uefa-nations-league/agente_unl.py" --modo completo ;;
  perfis)   "$PY" "$APP/agentes/unl-jogadores/agente_jogadores.py" --todas ;;
  *) echo "Uso: $0 [agente|perfis|completo]" >&2; exit 2 ;;
esac
"$PY" "$APP/scripts/export-nations-league.py"
# probabilidades dos grupos (precisa do histórico de jogos; se faltar, não derruba a atualização)
if [ -f "$APP/data/historico/results.csv" ] && [ -f "$APP/scripts/export-probabilidades-nl.py" ]; then
  "$PY" "$APP/scripts/export-probabilidades-nl.py" 20000 || echo "$(date -Is) AVISO: probabilidades não geradas"
fi
# base da tela de comparação entre seleções (confrontos desde 1930 + médias de jogo)
if [ -f "$APP/data/historico/results.csv" ] && [ -f "$APP/scripts/export-comparacao.py" ]; then
  "$PY" "$APP/scripts/export-comparacao.py" || echo "$(date -Is) AVISO: comparação não gerada"
fi
echo "$(date -Is) fim"
