@echo off
title InfoProcess Exam

start "Backend API" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8782"

timeout /t 2 > nul

start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5500"

timeout /t 3 > nul

start http://localhost:5500

pause
