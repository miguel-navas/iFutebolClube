@echo off
REM Exporta os dados da Nations League (grupos, classificacao e jogos) para o site.
REM   exportar-nations-league.bat         -> edicao 2027 (2026/27)
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. & pause & exit /b 1)
"%PYEXE%" scripts\export-nations-league.py %*
echo.
pause
