$ErrorActionPreference = 'Stop'

$adbCommand = Get-Command adb -ErrorAction SilentlyContinue
$adbPath = if ($adbCommand) {
  $adbCommand.Source
} else {
  Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
}

if (-not (Test-Path -LiteralPath $adbPath)) {
  throw 'ADB was not found. Install Android platform-tools or add adb to PATH.'
}

& $adbPath start-server | Out-Null

$connectedDevices = & $adbPath devices
if (-not ($connectedDevices -match "`tdevice$")) {
  throw 'No authorised Android device was found. Connect your phone by USB and enable USB debugging.'
}

& $adbPath reverse tcp:8081 tcp:8081 | Out-Null
& $adbPath reverse tcp:8080 tcp:8080 | Out-Null

Write-Host 'USB forwarding is ready:' -ForegroundColor Green
Write-Host '  Phone 127.0.0.1:8081 -> Metro 8081'
Write-Host '  Phone 127.0.0.1:8080 -> Spring Boot 8080'
if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Warning 'The TaskGrid backend is not listening on port 8080. The app can open, but wallet and other account actions will not load yet.'
}
if ((& $adbPath shell dumpsys power) -match 'mWakefulness=Dozing') {
  Write-Warning 'Your phone appears locked or asleep. Unlock it and keep TaskGrid visible while it loads.'
}

$taskgridOpenUrl = 'http://127.0.0.1:8081/_expo/open?platform=android&runtime=custom'
$taskgridServer = $null
try {
  $taskgridServer = Invoke-RestMethod -Uri $taskgridOpenUrl -TimeoutSec 3
} catch {
  if (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 8081 is in use, but it is not a reachable TaskGrid Metro server. Stop the process using that port before starting TaskGrid.'
  }
}

if ($taskgridServer) {
  if ($taskgridServer.appId -ne 'com.taskgrid.mobile') {
    throw 'Port 8081 belongs to a different Expo app. Stop that server before starting TaskGrid.'
  }
  Invoke-RestMethod -Method Post -Uri $taskgridOpenUrl -TimeoutSec 15 | Out-Null
  Write-Host 'TaskGrid Metro is already running; reopened the installed app with the correct URL.' -ForegroundColor Green
  return
}

$taskgridProjectDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskgridExpoCli = Join-Path $taskgridProjectDir 'node_modules\expo\bin\cli'
if (-not (Test-Path -LiteralPath $taskgridExpoCli)) {
  throw 'Expo CLI is missing. Run npm install in the TaskGrid mobile directory first.'
}

Write-Host 'Starting TaskGrid Metro on IPv4 localhost and opening the installed app...' -ForegroundColor Cyan
Push-Location $taskgridProjectDir
try {
  & node --dns-result-order=ipv4first $taskgridExpoCli start --dev-client --localhost --android
} finally {
  Pop-Location
}
