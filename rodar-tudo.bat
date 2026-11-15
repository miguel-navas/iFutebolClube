@echo off
cd /d C:\AI\iFutebolClube
set IFC_BANCO=sqlite
echo Rodando testes Python... > logs\rodar-tudo.log
python -m unittest discover -s scripts -p "test_*.py" >> logs\rodar-tudo.log 2>&1
echo PYTHON_EXIT=%ERRORLEVEL% >> logs\rodar-tudo.log
cd app\frontend
call npx playwright test tests/e2e/comparison.spec.ts tests/e2e/probabilities.spec.ts tests/e2e/match-detail.spec.ts tests/e2e/squad-details.spec.ts >> ..\..\logs\rodar-tudo.log 2>&1
set PW=%ERRORLEVEL%
echo PLAYWRIGHT_EXIT=%PW% >> ..\..\logs\rodar-tudo.log
cd ..\..
if "%PW%"=="0" (python scripts\empacotar_release.py >> logs\rodar-tudo.log 2>&1 & echo PACOTE_EXIT=%ERRORLEVEL% >> logs\rodar-tudo.log)
echo FIM >> logs\rodar-tudo.log
