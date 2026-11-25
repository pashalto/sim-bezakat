@echo off
cd /d "%~dp0"
set "PHP_BIN=php"
where php >nul 2>nul
if errorlevel 1 set "PHP_BIN=D:\xampp\php\php.exe"
echo SIM-BEZAKAT PHP: http://127.0.0.1:8088
echo Biarkan terminal ini terbuka. Tekan Ctrl+C untuk berhenti.
"%PHP_BIN%" -S 127.0.0.1:8088 -t public router.php
pause
