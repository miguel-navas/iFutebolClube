@echo off
setlocal enabledelayedexpansion
REM Exporta TODAS as Copas do Mundo anteriores (1930 a 2022) para o site, a partir do banco CopaDoMundo.
REM   exportar-copas-historicas.bat            -> 1930..2022 (a 2026 nao e refeita)
REM   exportar-copas-historicas.bat 1970 1974  -> so as edicoes listadas
REM Log: logs\exportar-copas-historicas.log
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. & pause & exit /b 1)
set LISTA=%*
if "%LISTA%"=="" set LISTA=1930 1934 1938 1950 1954 1958 1962 1966 1970 1974 1978 1982 1986 1990 1994 1998 2002 2006 2010 2014 2018 2022
echo Inicio %DATE% %TIME% > logs\exportar-copas-historicas.log
for %%Y in (%LISTA%) do (
  echo === Copa %%Y === >> logs\exportar-copas-historicas.log
  "%PYEXE%" scripts\export-edition.py %%Y >> logs\exportar-copas-historicas.log 2>&1
  echo EXIT_%%Y=!ERRORLEVEL! >> logs\exportar-copas-historicas.log
)
echo FIM >> logs\exportar-copas-historicas.log
echo Pronto. Veja logs\exportar-copas-historicas.log
pause
