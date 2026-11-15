# Publicar o iFutebolClube na VM do Google

Site: **www.ifutebolclube.com.br** (o endereço sem `www` redireciona). VM Linux (Debian/Ubuntu) com nginx.

## Como as peças se encaixam

| Onde | O que |
|---|---|
| PC | `converter-para-sqlite.bat` copia o SQL Server para `data\sqlite\CopaDoMundo.sqlite` |
| PC | `scripts\empacotar_release.py` faz o build do site e monta o pacote `.tar.gz` |
| VM | `/var/www/ifutebolclube/current` → versão do site publicada (nginx serve daqui) |
| VM | `/var/www/ifutebolclube/data` → JSON do site (`editions`, `stats`, mapa). Fora das versões, para os exportadores atualizarem sem republicar o site |
| VM | `/opt/ifutebolclube/data/sqlite` → bancos SQLite; `/opt/ifutebolclube/scripts` → exportadores |

## 1. Conferir o SQLite no PC (uma vez)

```
cd C:\AI\iFutebolClube\scripts
.\converter-para-sqlite.bat           # gera data\sqlite\CopaDoMundo.sqlite
.\comparar-exportacoes.bat            # exporta pelos dois bancos e compara; deve dizer IGUAIS
```

Outros bancos (Eurocopa, Nations League): `converter-para-sqlite.bat --bd NomeDoBanco`.

## 2. DNS (no painel do domínio, ex.: Registro.br)

Depois do passo 3 o script mostra o IP externo da VM. Crie dois registros **A**: `ifutebolclube.com.br` e
`www.ifutebolclube.com.br`, ambos apontando para esse IP. No Google Cloud, libere as portas **80** e **443**
(regra de firewall da VM). A propagação pode levar de minutos a horas.

## 3. Preparar a VM (uma vez)

Envie a pasta `deploy` para a VM (ou extraia de um pacote, passo 4) e rode:

```
sudo bash instalar_vm.sh
```

Instala nginx, certbot, Python e SQLite, cria as pastas e põe o site (provisório) no ar por HTTP.
Não mexe nos outros sites da VM (cria só `/etc/nginx/sites-available/ifutebolclube` e testa com `nginx -t`).

## 4. Empacotar e publicar

No PC:

```
python scripts\empacotar_release.py --com-sqlite
```

Gera `release\ifutebolclube-AAAAMMDD-HHMMSS.tar.gz` (site + exportadores + SQLite). Envie para a VM com
`gcloud compute scp` ou `scp` e, na VM, extraia só a pasta `deploy` e publique:

```
tar -xzf ifutebolclube-*.tar.gz deploy
bash deploy/publicar_site.sh ifutebolclube-*.tar.gz --com-dados
```

`--com-dados` leva também os JSON que já existem no PC (use na primeira vez). Nas próximas publicações do
site, sem `--com-dados`, os JSON da VM não são tocados. Se o pacote traz SQLite, o banco atual da VM
é copiado para `/opt/ifutebolclube/data/sqlite-backup` antes de ser trocado.

## 5. HTTPS

Com o DNS já apontando para a VM:

```
sudo bash deploy/instalar_vm.sh --https --email SEU@EMAIL
```

O certbot emite o certificado (Let's Encrypt) para os dois endereços e liga o redirecionamento para HTTPS.
A renovação é automática.

## 6. Atualizar os dados na VM

```
/opt/ifutebolclube/scripts/atualizar_dados.sh
```

Lê o SQLite e regrava `editions` e `stats` em `/var/www/ifutebolclube/data`. Para rodar de hora em hora,
`crontab -e`:

```
0 * * * * /opt/ifutebolclube/scripts/atualizar_dados.sh >> /opt/ifutebolclube/logs/dados.log 2>&1
```

Os agentes (coleta) ainda gravam no SQL Server; passá-los para o SQLite da VM é a próxima etapa.
`fifa-ranking.json` é um retrato manual (veja o README do frontend) e vai com `--com-dados`.
