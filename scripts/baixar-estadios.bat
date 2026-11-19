@echo off
REM Baixa fotos dos estadios da Wikimedia Commons (precisa de internet). Pode ser interrompido e rodado de novo.
REM   baixar-estadios.bat                 -> Copas do Mundo
REM   baixar-estadios.bat copa eurocopa   -> competicoes escolhidas
cd /d "%~dp0.."
if not exist logs mkdir logs
python -u scripts\baixar-estadios.py %* 2>&1 | powershell -NoProfile -Command "$input | Tee-Object -FilePath logs\baixar-estadios.log"
echo.
echo Pronto. Veja logs\baixar-estadios.log e app\frontend\public\estadios
pause
