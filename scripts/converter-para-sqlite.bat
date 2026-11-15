@echo off
REM Copia o banco CopaDoMundo do SQL Server para data\sqlite\CopaDoMundo.sqlite.
REM   converter-para-sqlite.bat                 -> so a Copa
REM   converter-para-sqlite.bat --bd Outro      -> outro banco (pode repetir)
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. ^& pause ^& exit /b 1)
"%PYEXE%" scripts\sqlserver_para_sqlite.py %*
echo.
pause
