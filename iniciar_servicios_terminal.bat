@echo off
echo ========================================
echo   Iniciando Servicios GoIca
echo   (Windows Terminal con pestanas)
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

REM Verificar si Windows Terminal está instalado
where wt >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Windows Terminal no esta instalado.
    echo Por favor instala Windows Terminal desde Microsoft Store.
    echo.
    echo Usando metodo alternativo...
    call iniciar_servicios_minimizado.bat
    exit /b
)

echo Iniciando servicios en Windows Terminal...
echo.

REM Iniciar Windows Terminal con múltiples pestañas
wt ^
  -w 0 new-tab --title "Cuentas" cmd /k "cd /d %~dp0\servicioCuentas && npm run dev" ^
  ; new-tab --title "Contenido" cmd /k "cd /d %~dp0\servicioContenido && npm run dev" ^
  ; new-tab --title "Interaccion" cmd /k "cd /d %~dp0\servicioInteraccion && npm run dev" ^
  ; new-tab --title "Recompensas" cmd /k "cd /d %~dp0\servicioRecompensas && npm run dev" ^
  ; new-tab --title "Administracion" cmd /k "cd /d %~dp0\servicioAdministracion && npm run dev" ^
  ; new-tab --title "Graficos" cmd /k "cd /d %~dp0\servicioGraficos && npm run dev" ^
  ; new-tab --title "Traduccion" cmd /k "cd /d %~dp0\servicioTraduccion && npm run dev" ^
  ; new-tab --title "Noticias" cmd /k "cd /d %~dp0\servicioNoticias && npm run dev" ^
  ; new-tab --title "Gateway" cmd /k "cd /d %~dp0\servicioGateway && npm run dev" ^
  ; new-tab --title "LibreTranslate" cmd /k "cd /d %~dp0\servicioLibreTranslate\LibreTranslate && .\run.bat --load-only es,en,de,fr,pt"

echo.
echo ========================================
echo   Servicios iniciados en Windows Terminal
echo ========================================
echo.
echo Todos los servicios estan en pestanas de una sola ventana.
echo Usa Ctrl+Tab para cambiar entre pestanas.
echo.
timeout /t 3 /nobreak >nul
