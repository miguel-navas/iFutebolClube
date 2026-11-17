@echo off
setlocal enabledelayedexpansion
REM Coleta e exporta as edicoes ANTERIORES da UEFA Nations League (2018/19, 2020/21, 2022/23, 2024/25).
REM Para cada temporada: roda o agente em modo completo (grava no banco UefaNationsLeague) e depois exporta para o site.
REM O ano da edicao e o ano UEFA da temporada: 2019 = 2018/19, 2021 = 2020/21, 2023 = 2022/23, 2025 = 2024/25.
REM   coletar-nations-league-historico.bat             -> as quatro
REM   coletar-nations-league-historico.bat 2019 2021   -> so as listadas
REM A edicao atual (2027) nao e tocada. Log: logs\coletar-nations-league-historico.log
cd /d "%~dp0.."
set PYEXE=..\Agentes\uefa-nations-league\.venv\Scripts\python.exe
if not exist "%PYEXE%" (echo Rode antes o setup.bat da pasta Agentes\uefa-nations-league. & pause & exit /b 1)
set LISTA=%*
if "%LISTA%"=="" set LISTA=2019 2021 2023 2025
set LOG=logs\coletar-nations-league-historico.log
echo Inicio %DATE% %TIME% > %LOG%
for %%Y in (%LISTA%) do (
  echo === Nations League %%Y: coleta === >> %LOG%
  set UEFA_TEMPORADA=%%Y
  pushd ..\Agentes\uefa-nations-league
  ".venv\Scripts\python.exe" agente_unl.py --modo completo >> "%~dp0..\%LOG%" 2>&1
  echo COLETA_%%Y=!ERRORLEVEL! >> "%~dp0..\%LOG%"
  popd
  echo === Nations League %%Y: exportacao === >> %LOG%
  "%PYEXE%" scripts\export-nations-league.py %%Y >> %LOG% 2>&1
  echo EXPORTA_%%Y=!ERRORLEVEL! >> %LOG%
)
set UEFA_TEMPORADA=
echo FIM >> %LOG%
echo Pronto. Veja %LOG%
pause
