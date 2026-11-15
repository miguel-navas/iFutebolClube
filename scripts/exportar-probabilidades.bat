@echo off
REM Gera as probabilidades da Copa 2026 (validacao do modelo) para o site.
REM Le o SQLite data\sqlite\CopaDoMundo.sqlite (rode antes converter-para-sqlite.bat se ele estiver desatualizado).
REM   exportar-probabilidades.bat          -> 30000 simulacoes
REM   exportar-probabilidades.bat 5000     -> menos simulacoes (mais rapido)
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" set PYEXE=python
set IFC_BANCO=sqlite
"%PYEXE%" scripts\export-probabilidades.py %*
echo.
pause
