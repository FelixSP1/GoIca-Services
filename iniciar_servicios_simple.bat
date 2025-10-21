@echo off
echo ========================================
echo   Iniciando Servicios GoIca
echo ========================================
echo.

REM Verificar Docker
tasklist | find /i "Docker Desktop.exe" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [INFO] Esperando 10 segundos para que Docker inicie...
    timeout /t 10 /nobreak >nul
)

echo [INFO] Iniciando servicios en segundo plano...
echo.

REM Iniciar todos los servicios en segundo plano (sin ventanas)
cd /d "%~dp0"

echo [1/8] Iniciando Servicio Cuentas...
start /B cmd /c "cd servicioCuentas && npm run dev > logs_cuentas.log 2>&1"
timeout /t 2 /nobreak >nul

echo [2/8] Iniciando Servicio Contenido...
start /B cmd /c "cd servicioContenido && npm run dev > logs_contenido.log 2>&1"
timeout /t 2 /nobreak >nul

echo [3/8] Iniciando Servicio Interaccion...
start /B cmd /c "cd servicioInteraccion && npm run dev > logs_interaccion.log 2>&1"
timeout /t 2 /nobreak >nul

echo [4/8] Iniciando Servicio Recompensas...
start /B cmd /c "cd servicioRecompensas && npm run dev > logs_recompensas.log 2>&1"
timeout /t 2 /nobreak >nul

echo [5/8] Iniciando Servicio Administracion...
start /B cmd /c "cd servicioAdministracion && npm run dev > logs_administracion.log 2>&1"
timeout /t 2 /nobreak >nul

echo [6/8] Iniciando Servicio Traduccion...
start /B cmd /c "cd servicioTraduccion && npm run dev > logs_traduccion.log 2>&1"
timeout /t 2 /nobreak >nul

echo [7/8] Iniciando Servicio Gateway...
start /B cmd /c "cd servicioGateway && npm run dev > logs_gateway.log 2>&1"
timeout /t 2 /nobreak >nul

echo [8/8] Iniciando LibreTranslate...
start /B cmd /c "cd servicioLibreTranslate\LibreTranslate && .\run.bat --load-only es,en,de,fr,pt > logs_libretranslate.log 2>&1"

echo.
echo ========================================
echo   Todos los servicios iniciados!
echo ========================================
echo.
echo Los logs se guardan en archivos logs_*.log
echo Para ver los logs en tiempo real, usa: tail -f logs_*.log
echo.
echo Presiona cualquier tecla para detener todos los servicios...
pause >nul

REM Detener todos los procesos de Node.js
echo.
echo Deteniendo servicios...
taskkill /F /IM node.exe >nul 2>&1
echo Servicios detenidos.
timeout /t 2 /nobreak >nul
