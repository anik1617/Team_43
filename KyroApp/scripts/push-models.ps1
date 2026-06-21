<#
.SYNOPSIS
    Push Kyro's on-device model files to the connected Android device/emulator.

.DESCRIPTION
    adb-pushes the three large model assets (Qwen LLM, Whisper ASR, BGE-M3 embedder)
    into the app's external files directory:
        /storage/emulated/0/Android/data/com.kyroapp/files/
    so llama.rn / whisper.rn / the embedder can load them at runtime.

    The signed knowledge bundle (edh-core-v1.kyro) ships INSIDE the APK assets and is
    therefore NOT pushed here.

    Source -> destination mapping:
        edge/models/Qwen2.5-3B-Instruct-Q4_K_M.gguf -> qwen.gguf
        edge/asr/ggml-base.en.bin                    -> ggml-base.en.bin
        edge/bge-m3-FP16.gguf                        -> bge-m3.gguf

    Prints local sizes, pushes each file, then lists the on-device files to confirm.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\push-models.ps1
#>

[CmdletBinding()]
param(
    # Path to adb. Defaults to the project's pinned platform-tools.
    [string]$Adb = "C:/Users/gowri/android-dev/sdk/platform-tools/adb.exe",

    # Optional: target a specific device serial (adb -s). Useful with >1 device.
    [string]$Serial = ""
)

$ErrorActionPreference = "Stop"

# --- Configuration ---------------------------------------------------------
$DestDir = "/storage/emulated/0/Android/data/com.kyroapp/files"

# Ordered list of (local source, on-device filename). Note: hashtables are not
# guaranteed ordered, so use an array of PSCustomObjects to keep push order.
$Models = @(
    [pscustomobject]@{ Src = "C:/Users/gowri/mb_hack/Team_43/edge/models/Qwen2.5-3B-Instruct-Q4_K_M.gguf"; Dst = "qwen.gguf" }
    [pscustomobject]@{ Src = "C:/Users/gowri/mb_hack/Team_43/edge/asr/ggml-base.en.bin";                    Dst = "ggml-base.en.bin" }
    [pscustomobject]@{ Src = "C:/Users/gowri/mb_hack/Team_43/edge/bge-m3-FP16.gguf";                        Dst = "bge-m3.gguf" }
)

# --- Helpers ---------------------------------------------------------------
function Format-Size([long]$bytes) {
    if ($bytes -ge 1GB) { return ("{0:N2} GB" -f ($bytes / 1GB)) }
    if ($bytes -ge 1MB) { return ("{0:N2} MB" -f ($bytes / 1MB)) }
    if ($bytes -ge 1KB) { return ("{0:N2} KB" -f ($bytes / 1KB)) }
    return "$bytes B"
}

# adb invocation helper that honours the optional -s <serial>.
function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)]$AdbArgs)
    if ($Serial) {
        & $Adb -s $Serial @AdbArgs
    } else {
        & $Adb @AdbArgs
    }
}

# --- Preflight -------------------------------------------------------------
Write-Host "=== Kyro model push ===" -ForegroundColor Cyan

if (-not (Test-Path $Adb)) {
    throw "adb not found at '$Adb'. Pass -Adb <path> or fix the default."
}
Write-Host "adb:  $Adb"

# Verify at least one device is connected and authorized.
$devicesRaw = & $Adb devices
$onlineDevices = @($devicesRaw | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" })
if ($onlineDevices.Count -eq 0) {
    Write-Host $devicesRaw
    throw "No authorized device/emulator found. Start the emulator or plug in a phone (and accept the USB-debugging prompt), then retry."
}
if (-not $Serial -and $onlineDevices.Count -gt 1) {
    Write-Host $devicesRaw
    throw "More than one device connected. Re-run with -Serial <serial> to pick one."
}
Write-Host ("device(s): {0}" -f ($onlineDevices -join ", "))
Write-Host ("dest: {0}" -f $DestDir)
Write-Host ""

# Verify all source files exist BEFORE pushing anything.
$missing = @()
foreach ($m in $Models) {
    if (-not (Test-Path $m.Src)) { $missing += $m.Src }
}
if ($missing.Count -gt 0) {
    throw "Missing source model file(s):`n  " + ($missing -join "`n  ")
}

# Ensure the destination directory exists on-device.
Invoke-Adb shell mkdir -p $DestDir | Out-Null

# --- Push ------------------------------------------------------------------
$index = 0
foreach ($m in $Models) {
    $index++
    $size = Format-Size ((Get-Item $m.Src).Length)
    Write-Host ("[{0}/{1}] {2}  ({3})  ->  {4}/{5}" -f $index, $Models.Count, (Split-Path $m.Src -Leaf), $size, $DestDir, $m.Dst) -ForegroundColor Yellow

    $dest = "$DestDir/$($m.Dst)"
    Invoke-Adb push $m.Src $dest
    if ($LASTEXITCODE -ne 0) {
        throw "adb push failed for '$($m.Src)' (exit $LASTEXITCODE)."
    }
    Write-Host ""
}

# --- Confirm ---------------------------------------------------------------
Write-Host "=== On-device files (after push) ===" -ForegroundColor Cyan
Invoke-Adb shell ls -la $DestDir

Write-Host ""
Write-Host "Done. Pushed $($Models.Count) model file(s) to $DestDir." -ForegroundColor Green
