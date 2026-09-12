@echo off
echo =======================================================
echo   RVoice Proton - Install Local SSL Certificate
echo =======================================================
echo.
echo Installing trusted local CA for Chrome and Edge...
"%~dp0certs\mkcert.exe" -install
echo.
echo =======================================================
echo  Done! Your browser will now natively trust:
echo    - https://localhost:3344
echo    - https://192.168.16.117:3344
echo =======================================================
pause
