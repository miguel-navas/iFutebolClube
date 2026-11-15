@echo off
rem Monta o pacote para publicar na VM (build do site + exportadores). Use --com-sqlite para levar o banco.
cd /d "%~dp0.."
python scripts\empacotar_release.py %*
pause
