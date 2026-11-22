param([switch]$SkipBrowsers, [switch]$KeepTestServer, [switch]$SkipMySQL)
$ErrorActionPreference = 'Stop'
$qaStarted = $false
Push-Location ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')))
try {
    function Run-Step([scriptblock]$Command) {
        & $Command
        if ($LASTEXITCODE -ne 0) { throw "La comprobación anterior falló con código $LASTEXITCODE." }
    }
    Run-Step { docker compose exec -T app php artisan test --compact }
    if (-not $SkipMySQL) { & (Join-Path $PSScriptRoot 'test-mysql.ps1') }
    Run-Step { docker compose exec -T app vendor/bin/phpstan analyse app database/seeders/LibraryDemoSeeder.php --no-progress --memory-limit=512M }
    Run-Step { npm run typecheck }
    Run-Step { npm run build }
    Run-Step { docker compose exec -T app composer audit }
    Run-Step { npm audit }
    if (-not $SkipBrowsers) {
        Run-Step { node scripts/playwright.mjs install chromium }
        Run-Step { docker compose --profile qa up -d --wait --wait-timeout 90 app-e2e }
        $qaStarted = $true
        Run-Step { docker compose exec -T app-e2e sh -c 'mkdir -p storage/app/private && touch storage/app/private/e2e.sqlite && php artisan migrate --force --no-interaction && php artisan db:seed --class=DemoSeeder --force --no-interaction && php artisan cache:clear' }
        Run-Step { npm run test:e2e }
    }
} finally {
    if ($qaStarted -and -not $KeepTestServer) { docker compose --profile qa stop app-e2e | Out-Null }
    Pop-Location
}
