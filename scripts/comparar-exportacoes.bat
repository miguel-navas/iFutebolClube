@echo off
REM Confere se exportar pelo SQLite da o mesmo resultado que pelo SQL Server.
REM   comparar-exportacoes.bat         -> edicao 2026
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. ^& pause ^& exit /b 1)
"%PYEXE%" scripts\comparar_exportacoes.py %*
echo.
pause
