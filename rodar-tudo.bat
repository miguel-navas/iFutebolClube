@echo off
cd /d C:\AI\iFutebolClube
set IFC_BANCO=sqlite
echo Rodando testes Python... > logs\rodar-tudo.log
python -m unittest discover -s scripts -p "test_*.py" >> logs\rodar-tudo.log 2>&1
echo PYTHON_EXIT=%ERRORLEVEL% >> logs\rodar-tudo.log
cd app\frontend
set E2E_PORT=3100
call npx playwright test tests/e2e/comparison.spec.ts tests/e2e/probabilities.spec.ts tests/e2e/match-detail.spec.ts tests/e2e/squad-details.spec.ts tests/e2e/hub.spec.ts tests/e2e/registry.spec.ts tests/e2e/side-menu.spec.ts tests/e2e/edition-notes.spec.ts tests/e2e/libertadores.spec.ts >> ..\..\logs\rodar-tudo.log 2>&1
set PW=%ERRORLEVEL%
echo PLAYWRIGHT_EXIT=%PW% >> ..\..\logs\rodar-tudo.log
cd ..\..
if "%PW%"=="0" (python scripts\gerar-resumos-edicoes.py & python scripts\empacotar_release.py >> logs\rodar-tudo.log 2>&1 & echo PACOTE_EXIT=%ERRORLEVEL% >> logs\rodar-tudo.log)
echo FIM >> logs\rodar-tudo.log
echo.
findstr /C:"PYTHON_EXIT" /C:"PLAYWRIGHT_EXIT" /C:"PACOTE_EXIT" logs\rodar-tudo.log
echo Detalhes em logs\rodar-tudo.log
