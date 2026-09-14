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
Write-Host ''
Write-Host 'Open the installed TaskGrid app after Metro reports that it is ready.' -ForegroundColor Cyan

& npx.cmd expo start --dev-client --clear
