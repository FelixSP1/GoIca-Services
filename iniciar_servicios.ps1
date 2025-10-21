# Script PowerShell para iniciar servicios GoIca
# Ejecutar con: .\iniciar_servicios.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Iniciando Servicios GoIca" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
$dockerRunning = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerRunning) {
    Write-Host "[INFO] Iniciando Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "[INFO] Esperando 10 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Cambiar al directorio del script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Array de servicios
$servicios = @(
    @{Nombre="Cuentas"; Carpeta="servicioCuentas"},
    @{Nombre="Contenido"; Carpeta="servicioContenido"},
    @{Nombre="Interaccion"; Carpeta="servicioInteraccion"},
    @{Nombre="Recompensas"; Carpeta="servicioRecompensas"},
    @{Nombre="Administracion"; Carpeta="servicioAdministracion"},
    @{Nombre="Traduccion"; Carpeta="servicioTraduccion"},
    @{Nombre="Gateway"; Carpeta="servicioGateway"}
)

# Iniciar servicios
$jobs = @()
foreach ($servicio in $servicios) {
    Write-Host "[INFO] Iniciando $($servicio.Nombre)..." -ForegroundColor Green
    
    $job = Start-Job -ScriptBlock {
        param($carpeta)
        Set-Location $carpeta
        npm run dev
    } -ArgumentList (Join-Path $scriptPath $servicio.Carpeta)
    
    $jobs += @{Job=$job; Nombre=$servicio.Nombre}
    Start-Sleep -Seconds 2
}

# Iniciar LibreTranslate
Write-Host "[INFO] Iniciando LibreTranslate..." -ForegroundColor Green
$libreJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    & .\run.bat --load-only es,en,de,fr,pt
} -ArgumentList (Join-Path $scriptPath "servicioLibreTranslate\LibreTranslate")

$jobs += @{Job=$libreJob; Nombre="LibreTranslate"}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Todos los servicios iniciados!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servicios en ejecucion:" -ForegroundColor Yellow
foreach ($item in $jobs) {
    Write-Host "  - $($item.Nombre)" -ForegroundColor White
}
Write-Host ""
Write-Host "Comandos disponibles:" -ForegroundColor Yellow
Write-Host "  [L] Ver logs de un servicio" -ForegroundColor White
Write-Host "  [S] Ver estado de servicios" -ForegroundColor White
Write-Host "  [Q] Detener todos los servicios y salir" -ForegroundColor White
Write-Host ""

# Loop de control
while ($true) {
    $key = Read-Host "Ingresa un comando (L/S/Q)"
    
    switch ($key.ToUpper()) {
        "L" {
            Write-Host ""
            Write-Host "Servicios disponibles:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $jobs.Count; $i++) {
                Write-Host "  [$i] $($jobs[$i].Nombre)" -ForegroundColor White
            }
            $index = Read-Host "Numero de servicio"
            if ($index -match '^\d+$' -and [int]$index -lt $jobs.Count) {
                $selectedJob = $jobs[[int]$index]
                Write-Host ""
                Write-Host "=== Logs de $($selectedJob.Nombre) ===" -ForegroundColor Cyan
                Receive-Job -Job $selectedJob.Job
                Write-Host ""
            }
        }
        "S" {
            Write-Host ""
            Write-Host "Estado de servicios:" -ForegroundColor Yellow
            foreach ($item in $jobs) {
                $estado = $item.Job.State
                $color = if ($estado -eq "Running") { "Green" } else { "Red" }
                Write-Host "  - $($item.Nombre): $estado" -ForegroundColor $color
            }
            Write-Host ""
        }
        "Q" {
            Write-Host ""
            Write-Host "Deteniendo servicios..." -ForegroundColor Yellow
            foreach ($item in $jobs) {
                Stop-Job -Job $item.Job
                Remove-Job -Job $item.Job
            }
            Write-Host "Servicios detenidos." -ForegroundColor Green
            Write-Host ""
            exit
        }
    }
}
