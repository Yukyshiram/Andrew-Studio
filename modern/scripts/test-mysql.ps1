param([string]$Filter = '', [switch]$KeepDatabase)
$ErrorActionPreference = 'Stop'
$qaStartAttempted = $false
Push-Location ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')))
try {
    $qaEnvironmentPath = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path '../.local/v3-test.env'))
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($qaEnvironmentPath)) | Out-Null
    if (-not (Test-Path -LiteralPath $qaEnvironmentPath)) {
        $qaPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
        $qaKey = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
        [IO.File]::WriteAllText($qaEnvironmentPath, "LIBRARY_QA_PASSWORD=$qaPassword`nLIBRARY_QA_APP_KEY=base64:$qaKey`n")
    }
    $composeArgs = @('-f', 'compose.test.yaml', '--env-file', $qaEnvironmentPath)
    $qaStartAttempted = $true
    & docker compose @composeArgs up -d --wait --wait-timeout 120 db-test
    if ($LASTEXITCODE -ne 0) { throw 'No arrancó el MySQL aislado de pruebas.' }
    $testArgs = @('vendor/bin/phpunit', '--colors=never', '--log-junit', 'storage/app/private/mysql-qa.xml')
    if ($Filter) { $testArgs += @('--filter', $Filter) }
    & docker compose @composeArgs run --rm -T app-test php @testArgs
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas MySQL. Revisa la salida anterior.' }
} finally {
    if ($qaStartAttempted -and -not $KeepDatabase) {
        & docker compose @composeArgs stop db-test
        if ($LASTEXITCODE -ne 0) { Write-Warning 'No se pudo detener db-test. No se eliminaron contenedores ni volúmenes.' }
    }
    Pop-Location
}
