@echo off
REM Exporta as estatisticas da Copa do Mundo para o site (app\frontend\public\data\stats\copa.json).
REM Usa o Python (com pyodbc) e o .env do agente em C:\AI\Agentes\uefa-nations-league.
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. & pause & exit /b 1)
"%PYEXE%" scripts\export-stats.py
echo.
pause
