@echo off
tasklist | find /i "Docker Desktop.exe" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Iniciando Docker Desktop
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 10 /nobreak >nul
)
start "Servicio Cuentas" cmd /k "cd servicioCuentas && npm run dev"
timeout /t 2
start "Servicio Contenido" cmd /k "cd servicioContenido && npm run dev"
timeout /t 2
start "Servicio Interacción" cmd /k "cd servicioInteraccion && npm run dev"
timeout /t 2
start "Servicio Recompensas" cmd /k "cd servicioRecompensas && npm run dev"
timeout /t 2
start "Servicio Administracion" cmd /k "cd servicioAdministracion && npm run dev"
timeout /t 2
start "Servicio Traducción" cmd /k "cd servicioTraduccion && npm run dev"
timeout /t 2
start "Servicio Graficos" cmd /k "cd servicioGraficos && npm run dev"
timeout /t 2
start "Servicio Noticias" cmd /k "cd servicioNoticias && npm run dev"
timeout /t 2
start "Servicio Gateway" cmd /k "cd servicioGateway && npm run dev"
echo Iniciando servicio de traduccion
cd /d %~dp0
start "LibreTranslate" /D "servicioLibreTranslate\LibreTranslate" cmd /k "@echo Iniciando LibreTranslate... && .\run.bat --load-only es,en,de,fr,pt"
timeout /t 5 /nobreak >nul