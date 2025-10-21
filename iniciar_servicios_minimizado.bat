@echo off
echo ========================================
echo   Iniciando Servicios GoIca (Minimizado)
echo ========================================
echo.

REM Verificar Docker
tasklist | find /i "Docker Desktop.exe" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 10 /nobreak >nul
)

cd /d "%~dp0"

echo Iniciando servicios (ventanas minimizadas)...
echo.

REM /MIN minimiza las ventanas
start /MIN "Servicio Cuentas" cmd /k "cd servicioCuentas && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "Servicio Contenido" cmd /k "cd servicioContenido && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "Servicio Interaccion" cmd /k "cd servicioInteraccion && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "Servicio Recompensas" cmd /k "cd servicioRecompensas && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "Servicio Administracion" cmd /k "cd servicioAdministracion && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "Servicio Traduccion" cmd /k "cd servicioTraduccion && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "Servicio Gateway" cmd /k "cd servicioGateway && npm run dev"
timeout /t 2 /nobreak >nul

start /MIN "LibreTranslate" /D "servicioLibreTranslate\LibreTranslate" cmd /k "@echo Iniciando LibreTranslate... && .\run.bat --load-only es,en,de,fr,pt"

echo.
echo ========================================
echo   Servicios iniciados (minimizados)
echo ========================================
echo.
echo Las ventanas estan minimizadas en la barra de tareas.
echo Para verlas, haz clic en los iconos de CMD en la barra.
echo.
pause
