$ErrorActionPreference = 'Stop'

$packageName = 'com.taskgrid.mobile'
$outputPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'dojah-live-log.txt'

function Protect-DiagnosticLine {
    param([string]$Line)

    $safe = $Line -replace '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[REDACTED_EMAIL]'
    $safe = $safe -replace '(?<!\d)\d{11}(?!\d)', '[REDACTED_ID_OR_PHONE]'
    $safe = $safe -replace '(?i)(authorization:\s*bearer\s+)[^\s,}]+', '$1[REDACTED_TOKEN]'
    $safe = $safe -replace '(?i)((?:api[_-]?key|secret[_-]?key)["''\s:=]+)[^\s,"''}]+', '$1[REDACTED_SECRET]'
    return $safe
}

$connectedDevices = @(
    adb devices |
        Select-Object -Skip 1 |
        Where-Object { $_ -match '\sdevice$' }
)

if ($connectedDevices.Count -eq 0) {
    throw 'No authorised Android device was found. Unlock the phone, enable USB debugging and accept the USB debugging prompt.'
}

Write-Host 'Clearing old Android logs and opening TaskGrid...'
adb logcat -c
adb shell am force-stop $packageName
adb shell monkey -p $packageName -c android.intent.category.LAUNCHER 1 | Out-Null
Start-Sleep -Seconds 3

$taskGridPid = (adb shell pidof $packageName).Trim()
if (-not $taskGridPid) {
    throw 'TaskGrid did not start. Confirm that the latest development build is installed.'
}

if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}

Write-Host ''
Write-Host 'Live KYC capture is running.' -ForegroundColor Green
Write-Host 'Reproduce: Begin verification -> BVN -> face scan -> Continue.'
Write-Host 'After the spinner has remained for about 20 seconds, return here and press Ctrl+C.'
Write-Host "The redacted log will be saved to: $outputPath"
Write-Host ''

adb logcat --pid=$taskGridPid -v threadtime |
    ForEach-Object {
        $safeLine = Protect-DiagnosticLine -Line $_
        $safeLine | Tee-Object -FilePath $outputPath -Append
    }
