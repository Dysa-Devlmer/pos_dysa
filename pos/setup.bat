@echo off
chcp 65001 >nul
title Sistema POS - Instalación Automática
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║         SISTEMA POS — INSTALACIÓN AUTOMÁTICA        ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ─── Detectar XAMPP o Laragon ───────────────────────────────
set "DESTINO="
set "MYSQL="
set "HTTPDCONF="

if exist "C:\xampp\htdocs\" (
    set "DESTINO=C:\xampp\htdocs\pos"
    set "MYSQL=C:\xampp\mysql\bin\mysql.exe"
    set "XAMPPDIR=C:\xampp"
    echo  [✔] XAMPP detectado en C:\xampp
    goto :found
)

if exist "C:\laragon\www\" (
    set "DESTINO=C:\laragon\www\pos"
    set "MYSQL=C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe"
    set "LARAGONDIR=C:\laragon"
    echo  [✔] Laragon detectado en C:\laragon
    goto :found
)

if exist "C:\wamp64\www\" (
    set "DESTINO=C:\wamp64\www\pos"
    set "MYSQL=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
    echo  [✔] WAMP detectado en C:\wamp64
    goto :found
)

echo  [✗] No se detectó XAMPP, Laragon ni WAMP.
echo  Por favor instala uno de ellos e intenta de nuevo.
pause
exit /b 1

:found
echo.
echo  Destino: %DESTINO%
echo.

:: ─── Copiar archivos del proyecto ──────────────────────────
echo  [1/4] Copiando archivos del proyecto...

if exist "%DESTINO%" (
    echo  [~] La carpeta pos ya existe. Actualizando archivos...
    xcopy /E /Y /I /Q "%~dp0*" "%DESTINO%\" >nul 2>&1
) else (
    mkdir "%DESTINO%"
    xcopy /E /Y /I /Q "%~dp0*" "%DESTINO%\" >nul 2>&1
)

echo  [✔] Archivos copiados correctamente
echo.

:: ─── Crear base de datos ────────────────────────────────────
echo  [2/4] Configurando base de datos...

:: Buscar MySQL en rutas alternativas
if not exist "%MYSQL%" (
    for /f "delims=" %%i in ('where mysql 2^>nul') do set "MYSQL=%%i"
)

if not exist "%MYSQL%" (
    if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL=C:\xampp\mysql\bin\mysql.exe"
    if exist "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" set "MYSQL=C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe"
    if exist "C:\laragon\bin\mysql\mysql-8.0.31-winx64\bin\mysql.exe" set "MYSQL=C:\laragon\bin\mysql\mysql-8.0.31-winx64\bin\mysql.exe"
    if exist "C:\laragon\bin\mysql\mysql-8.0.32-winx64\bin\mysql.exe" set "MYSQL=C:\laragon\bin\mysql\mysql-8.0.32-winx64\bin\mysql.exe"
    if exist "C:\laragon\bin\mysql\mysql-8.0.33-winx64\bin\mysql.exe" set "MYSQL=C:\laragon\bin\mysql\mysql-8.0.33-winx64\bin\mysql.exe"
)

if exist "%MYSQL%" (
    echo  Importando base de datos pos.sql...
    "%MYSQL%" -u root --password= -e "CREATE DATABASE IF NOT EXISTS pos CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;" 2>nul
    "%MYSQL%" -u root --password= pos < "%DESTINO%\pos.sql" 2>nul
    if %errorlevel% == 0 (
        echo  [✔] Base de datos importada correctamente
    ) else (
        echo  [!] No se pudo importar automáticamente.
        echo      Importa manualmente: phpMyAdmin → Base de datos "pos" → Importar → pos.sql
    )
) else (
    echo  [!] MySQL no encontrado automáticamente.
    echo      Importa manualmente en phpMyAdmin:
    echo      1. Crea la DB "pos"
    echo      2. Importa el archivo pos.sql
)

echo.

:: ─── Verificar mod_rewrite en XAMPP ────────────────────────
echo  [3/4] Verificando configuración de Apache...

if exist "C:\xampp\apache\conf\httpd.conf" (
    findstr /C:"LoadModule rewrite_module" "C:\xampp\apache\conf\httpd.conf" | findstr /V "#" >nul 2>&1
    if %errorlevel% == 0 (
        echo  [✔] mod_rewrite ya está activo
    ) else (
        echo  [~] Activando mod_rewrite en httpd.conf...
        powershell -Command "(Get-Content 'C:\xampp\apache\conf\httpd.conf') -replace '#LoadModule rewrite_module','LoadModule rewrite_module' | Set-Content 'C:\xampp\apache\conf\httpd.conf'"
        echo  [✔] mod_rewrite activado
    )

    :: Activar AllowOverride All
    powershell -Command "$c = Get-Content 'C:\xampp\apache\conf\httpd.conf' -Raw; $c = $c -replace 'AllowOverride None','AllowOverride All'; Set-Content 'C:\xampp\apache\conf\httpd.conf' $c"
    echo  [✔] AllowOverride configurado

    :: Reiniciar Apache si está corriendo
    tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe" >nul 2>&1
    if %errorlevel% == 0 (
        echo  [~] Reiniciando Apache...
        "C:\xampp\apache\bin\httpd.exe" -k restart >nul 2>&1
        echo  [✔] Apache reiniciado
    )
) else (
    echo  [✔] Laragon/WAMP: mod_rewrite activo por defecto
)

echo.

:: ─── Abrir navegador ────────────────────────────────────────
echo  [4/4] Abriendo el sistema en el navegador...
timeout /t 2 >nul
start "" "http://localhost/pos"

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║               ✔ INSTALACIÓN COMPLETA                ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║  URL:         http://localhost/pos                   ║
echo  ║  Usuario:     admin                                  ║
echo  ║  Contraseña:  admin                                  ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
