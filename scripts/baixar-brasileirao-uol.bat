@echo off
cd /d "%~dp0\.."
if not exist logs mkdir logs
echo Baixando as paginas dos jogos do Brasileirao no UOL (1 por segundo, pode demorar ~10 min)...
powershell -NoProfile -Command "python -u scripts\baixar-brasileirao-uol.py %* 2>&1 | Tee-Object -FilePath logs\baixar-brasileirao-uol.log"
echo.
echo Terminou. Log em logs\baixar-brasileirao-uol.log
pause
