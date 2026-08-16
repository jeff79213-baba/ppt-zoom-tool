@echo off
cd /d "%~dp0"

rem check if server already running on port 8000
netstat -an | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  start "ppt-server" /min python -m http.server 8000
  timeout /t 2 /nobreak >nul
)

start "" http://localhost:8000/index.html
exit