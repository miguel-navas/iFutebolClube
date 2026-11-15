#!/usr/bin/env bash
# Prepara a VM (Debian/Ubuntu) para servir o iFutebolClube. Pode rodar mais de uma vez.
#
#   sudo bash instalar_vm.sh                                  # nginx + pastas + site no ar (HTTP)
#   sudo bash instalar_vm.sh --https --email voce@exemplo.com # depois que o DNS apontar para a VM
#
# Não mexe nos outros sites da VM: cria só /etc/nginx/sites-available/ifutebolclube e testa a
# configuração (nginx -t) antes de recarregar.
set -euo pipefail

DOMINIO=ifutebolclube.com.br
WWW=www.$DOMINIO
SITE=/var/www/ifutebolclube
APP=/opt/ifutebolclube
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTTPS=0
EMAIL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --https) HTTPS=1 ;;
    --email) EMAIL="${2:-}"; shift ;;
    *) echo "Opção desconhecida: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash $0 $*" >&2
  exit 1
fi

DONO="${SUDO_USER:-root}"

echo "== Pacotes (nginx, certbot, python, sqlite)"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx certbot python3-certbot-nginx python3 python3-venv sqlite3 rsync >/dev/null

echo "== Pastas"
mkdir -p "$SITE/releases" "$SITE/data" "$APP/scripts" "$APP/data/sqlite" "$APP/logs"
chown -R "$DONO":"$DONO" "$SITE" "$APP"

# Página provisória até a primeira publicação.
if [ ! -e "$SITE/current" ]; then
  mkdir -p "$SITE/releases/inicial"
  printf '<!doctype html><meta charset="utf-8"><title>iFutebolClube</title><p>iFutebolClube: em breve.</p>\n' > "$SITE/releases/inicial/index.html"
  ln -sfn "$SITE/releases/inicial" "$SITE/current"
  chown -R "$DONO":"$DONO" "$SITE/releases/inicial"
fi

echo "== nginx"
install -m 644 "$AQUI/nginx-ifutebolclube.conf" /etc/nginx/sites-available/ifutebolclube
ln -sfn /etc/nginx/sites-available/ifutebolclube /etc/nginx/sites-enabled/ifutebolclube
nginx -t
systemctl reload nginx

echo "== Ambiente Python dos exportadores"
if [ ! -x "$APP/.venv/bin/python" ]; then
  python3 -m venv "$APP/.venv"
  chown -R "$DONO":"$DONO" "$APP/.venv"
fi

IP="$(curl -fsS -m 5 https://api.ipify.org 2>/dev/null || echo '(não consegui descobrir)')"
echo
echo "Site no ar por HTTP. IP externo desta VM: $IP"
echo "No painel do domínio (Registro.br) crie os registros DNS:"
echo "    A   $DOMINIO      -> $IP"
echo "    A   $WWW   -> $IP"
echo "E no Google Cloud libere as portas 80 e 443 (firewall da VM)."

if [ "$HTTPS" -eq 1 ]; then
  if [ -z "$EMAIL" ]; then
    echo "Para o HTTPS informe o e-mail: --https --email voce@exemplo.com" >&2
    exit 1
  fi
  echo "== HTTPS (Let's Encrypt)"
  certbot --nginx -d "$DOMINIO" -d "$WWW" --non-interactive --agree-tos -m "$EMAIL" --redirect
  echo "HTTPS ativado. A renovação é automática (systemctl list-timers | grep certbot)."
else
  echo "Quando o DNS estiver apontando: sudo bash $0 --https --email SEU@EMAIL"
fi
