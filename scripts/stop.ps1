$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot 'data/server.pid'
if (Test-Path -LiteralPath $pidFile) {
    $serverProcessId = [int](Get-Content -LiteralPath $pidFile)
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
    $expectedPath = Join-Path $projectRoot 'server/index.mjs'
    if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine.Contains($expectedPath)) {
        Stop-Process -Id $serverProcessId
        Write-Output 'Grokbot City stopped.'
    }
    Remove-Item -LiteralPath $pidFile
}
