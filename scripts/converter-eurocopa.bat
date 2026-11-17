@echo off
REM Copia o banco Eurocopa do SQL Server para data\sqlite\Eurocopa.sqlite
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. ^& pause ^& exit /b 1)
"%PYEXE%" scripts\sqlserver_para_sqlite.py --bd Eurocopa > logs\converter-eurocopa.log 2>&1
echo EXIT=%ERRORLEVEL% >> logs\converter-eurocopa.log
