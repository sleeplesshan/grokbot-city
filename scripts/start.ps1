$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot 'data/config.json'
$config = if (Test-Path -LiteralPath $configPath) { Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json } else { [pscustomobject]@{port=4318} }
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'data') | Out-Null
try {
    $health = Invoke-RestMethod "http://127.0.0.1:$($config.port)/api/health" -TimeoutSec 2
    if ($health.ok -and $health.app -eq 'grokbot-city') { Write-Output 'Grokbot City is already running.'; exit 0 }
} catch {}
$logDir = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$nodePath = (Get-Command node.exe).Source
$serverPath = Join-Path $projectRoot 'server/index.mjs'
$process = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'error.log') -PassThru
Set-Content -LiteralPath (Join-Path $projectRoot 'data/server.pid') -Value $process.Id
$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    $process.Refresh()
    if ($process.HasExited) { break }
    try {
        $health = Invoke-RestMethod "http://127.0.0.1:$($config.port)/api/health" -TimeoutSec 1
        if ($health.ok -and $health.app -eq 'grokbot-city') { $ready = $true; break }
    } catch {}
}
if (-not $ready) {
    throw "Grokbot City failed to start. Check $logDir/error.log."
}
Write-Output 'Grokbot City started and health check passed.'
