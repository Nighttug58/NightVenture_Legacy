@echo off
title Lancement Serveur NightVenture - Port 8000
cd /d "C:\TCIT\NightVenture"

:: Ouvre le navigateur sur le localhost
start "" "http://localhost:8000"

:: Lance le serveur local (Exemple avec Python)
python -m http.server 8000

pause
