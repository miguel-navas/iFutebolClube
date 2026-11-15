@echo off
REM Inicia o site iFutebolClube localmente (http://localhost:3000)
cd /d "%~dp0..\app\frontend"
start "" http://localhost:3000/nations-league
call npm run dev
pause
