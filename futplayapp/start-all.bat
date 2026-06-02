@echo off
cd /d "C:\Users\joaqu\OneDrive\Desktop\futplay\futplayapp\futplayapp"
echo Killing old processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ssh.exe >nul 2>&1
timeout /t 3 /nobreak >nul

echo Starting dev server...
start "NextDev" cmd /c "npm run dev"
timeout /t 12 /nobreak >nul

echo Starting tunnel...
start "Tunnel" cmd /c "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3000 nokey@localhost.run"
timeout /t 8 /nobreak >nul

echo Done. Dev server + tunnel should be running.
