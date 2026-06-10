
@echo off
setlocal

REM Change to script directory
cd /d "%~dp0"

REM Check if Node.js is installed (using PATH)
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRORE] Node.js non trovato nel PATH del sistema.
    echo Per favore installa Node.js da https://nodejs.org
    echo Assicurati che Node.js sia aggiunto al PATH durante l'installazione.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [AVVISO] Cartella node_modules non trovata.
    echo Installazione dipendenze in corso...
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERRORE] Installazione dipendenze fallita.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dipendenze installate con successo!
    echo.
)

echo ========================================
echo 🍛 1. GENERAZIONE MENU GIORNALIERI
echo ========================================
node "giornaliero.js"
if errorlevel 1 goto error

echo.
echo ========================================
echo 📅 2. GENERAZIONE MENU SETTIMANALE (PREMIUM)
echo ========================================
node "settimanale.js"
if errorlevel 1 goto error

echo.
echo ========================================
echo 💼 3. GENERAZIONE MENU BFT (BUSINESS)
echo ========================================
node "menu-bft.js"
if errorlevel 1 goto error

echo.
echo ========================================
echo 💰 4. GENERAZIONE MENU GIORNALIERI CON PREZZI
echo ========================================
node "giornaliero_prezzi.js"
if errorlevel 1 goto error

echo.
echo ========================================
echo 🎉 TUTTI I MENU GENERATI CON SUCCESSO!
echo ========================================
pause
exit /b 0

:error
echo.
echo ****************************************
echo ❌ ERRORE DURANTE LA GENERAZIONE!
echo ****************************************
pause
exit /b 1
