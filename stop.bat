@echo off
title Stop Servers

echo Stopping backend (port 8782)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8782 "') do (
    taskkill /F /PID %%a > nul 2>&1
)

echo Stopping frontend (port 5500)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500 "') do (
    taskkill /F /PID %%a > nul 2>&1
)

echo Servers stopped.
timeout /t 2 > nul
