@echo off
echo ========================================
echo Copiando archivo .env a todos los servicios
echo ========================================
echo.

REM Copiar .env.example a cada servicio como .env
copy .env.example servicioCuentas\.env
echo [OK] servicioCuentas

copy .env.example servicioContenido\.env
echo [OK] servicioContenido

copy .env.example servicioInteraccion\.env
echo [OK] servicioInteraccion

copy .env.example servicioAdministracion\.env
echo [OK] servicioAdministracion

copy .env.example servicioRecompensas\.env
echo [OK] servicioRecompensas

copy .env.example servicioGateway\.env
echo [OK] servicioGateway

echo.
echo ========================================
echo Archivos .env copiados exitosamente!
echo ========================================
echo.
echo IMPORTANTE: Edita cada .env si necesitas configuraciones especificas
echo.
pause
