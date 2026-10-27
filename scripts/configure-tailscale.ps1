$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$status = tailscale status --json | ConvertFrom-Json
if ($status.BackendState -ne 'Running') { throw 'Sign in to Tailscale first.' }
$userId = [string]$status.Self.UserID
$owner = $status.User.PSObject.Properties[$userId].Value.LoginName
$dnsName = $status.Self.DNSName.TrimEnd('.')
if (-not $owner -or -not $dnsName) { throw 'Cannot determine Tailscale owner or DNS name.' }
$configPath = Join-Path $projectRoot 'data/config.json'
$config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
$config.allowedLogin = $owner
$config.tailscaleHost = $dnsName
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
Write-Output 'Configured private Tailscale owner access. Restart the app to apply.'
tailscale serve --bg --yes "http://127.0.0.1:$($config.port)"
if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve could not be enabled.' }
