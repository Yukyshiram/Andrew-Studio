$ErrorActionPreference = 'Stop'
Push-Location ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')))
try {
    docker compose down
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener el entorno.' }
    Write-Output 'Entorno detenido; volumen de datos conservado.'
} finally { Pop-Location }
