@echo off
REM === Push initial de PaxKonnect vers GitHub (à lancer APRÈS avoir créé le repo privé "paxkonnect" sur github.com/new) ===
cd /d "%~dp0"

REM Nettoyage d'un éventuel verrou git résiduel
if exist ".git\config.lock" del ".git\config.lock"

REM Identité git (locale au repo)
git config user.name "Axel Medjber"
git config user.email "djaxoo.be@gmail.com"

REM Remote + push
git remote remove origin 2>nul
git remote add origin https://github.com/axelmedjber/paxkonnect.git
git push -u origin main

echo.
echo === Termine. Verifie sur https://github.com/axelmedjber/paxkonnect ===
pause
