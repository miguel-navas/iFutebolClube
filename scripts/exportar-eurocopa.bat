@echo off
REM Exporta a Eurocopa (fase final, 1960-2024) para o site.
REM   exportar-eurocopa.bat         -> todas as edicoes
REM   exportar-eurocopa.bat 2024    -> uma edicao
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. ^& pause ^& exit /b 1)
"%PYEXE%" scripts\export-eurocopa.py %*
echo.
pause
