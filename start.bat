@echo off
title NOISE — Launcher
color 0A

echo.
echo  ███╗   ██╗ ██████╗ ██╗███████╗███████╗
echo  ████╗  ██║██╔═══██╗██║██╔════╝██╔════╝
echo  ██╔██╗ ██║██║   ██║██║███████╗█████╗
echo  ██║╚██╗██║██║   ██║██║╚════██║██╔══╝
echo  ██║ ╚████║╚██████╔╝██║███████║███████╗
echo  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚══════╝╚══════╝
echo.
echo  Iniciando Backend ^(puerto 8000^) y Frontend React ^(puerto 3000^)...
echo.

REM ── Backend ──────────────────────────────────────────────────────────
start "NOISE Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

REM Esperar 2 segundos a que el backend arranque antes de lanzar el frontend
timeout /t 2 /nobreak >nul

REM ── Frontend (React + Vite) ──────────────────────────────────────────
start "NOISE Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Esperar 3 segundos y abrir el navegador
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo.
echo  Cierra las ventanas de terminal para detener los servidores.
echo.
