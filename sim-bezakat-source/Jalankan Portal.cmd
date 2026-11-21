@echo off
cd /d "%~dp0"
title SIM-BEZAKAT Student Portal
echo Buka alamat Local yang tertera di bawah. Biarkan jendela ini terbuka.
call npm.cmd run dev
pause
