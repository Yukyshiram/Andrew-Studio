param([switch]$Demo)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $projectDirectory
try {
    foreach ($tool in @('docker', 'node', 'npm')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Falta $tool. Instálalo y vuelve a ejecutar este script." }
    }
    function Run-Step([scriptblock]$Command) {
        & $Command
        if ($LASTEXITCODE -ne 0) { throw "La etapa anterior falló con código $LASTEXITCODE." }
    }
    if (-not (Test-Path -LiteralPath '.env')) {
        $configText = [IO.File]::ReadAllText((Join-Path $projectDirectory '.env.example')).Replace("`r`n", "`n")
        foreach ($key in @('DB_PASSWORD', 'DB_ROOT_PASSWORD')) {
            $randomBytes = [byte[]]::new(24)
            $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
            try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
            $value = -join ($randomBytes | ForEach-Object { $_.ToString('x2') })
            $configText = $configText.Replace("$key=`n", "$key=$value`n")
        }
        [IO.File]::WriteAllText((Join-Path $projectDirectory '.env'), $configText, [Text.UTF8Encoding]::new($false))
    }
    Run-Step { docker compose config --quiet }
    Run-Step { docker compose build app }
    Run-Step { docker compose run --rm --no-deps app composer install --prefer-dist --no-interaction }
    Run-Step { npm ci --no-fund }
    Run-Step { npm run build }
    $appKeyLine = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^APP_KEY=' } | Select-Object -First 1
    if (-not $appKeyLine -or $appKeyLine -eq 'APP_KEY=') {
        Run-Step { docker compose run --rm --no-deps app php artisan key:generate --force }
    }
    Run-Step { docker compose up -d --wait --wait-timeout 120 }
    Run-Step { docker compose exec -T app php artisan migrate --force }
    if ($Demo) { Run-Step { docker compose exec -T app php artisan db:seed --class=DemoSeeder --force } }
    $configuredPort = (Get-Content '.env' | Where-Object { $_ -match '^APP_PORT=' } | Select-Object -First 1) -replace '^APP_PORT=', ''
    Write-Output "Bibliotecary está disponible en http://localhost:$configuredPort"
    Write-Output 'El legado y su base de datos se conservan. No se ejecutó ninguna importación.'
} finally { Pop-Location }
