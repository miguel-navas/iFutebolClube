@echo off
cd /d "%~dp0\.."
python -u scripts\extrair-brasileirao-uol.py %*
pause
