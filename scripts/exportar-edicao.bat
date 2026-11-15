@echo off
REM Exporta os dados de uma edicao da Copa (grupos, classificacao e jogos) para o site.
REM   exportar-edicao.bat         -> edicao 2026
REM   exportar-edicao.bat 2022    -> outra edicao
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. & pause & exit /b 1)
"%PYEXE%" scripts\export-edition.py %*
echo.
pause
