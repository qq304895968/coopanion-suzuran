# ComfyUI one-click launcher for this installation.
# Usage:
#   start_coo-gen.bat                  (user mode: opens the browser when ready)
#   start_coo-gen.bat -Service        (plugin mode: no browser, no pause)
# Unknown arguments (for example --port 8188 from older configs) are ignored.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Service = $false
$TimeoutSeconds = 120
$i = 0
while ($i -lt $args.Count) {
  $arg = [string]$args[$i]
  switch -Regex ($arg) {
    '^--?service$' { $Service = $true; $i++; continue }
    '^--?timeout(seconds)?$' {
      if ($i + 1 -lt $args.Count) {
        $parsed = 0
        if ([int]::TryParse([string]$args[$i + 1], [ref]$parsed)) { $TimeoutSeconds = $parsed }
      }
      $i += 2
      continue
    }
    default { $i++ }
  }
}
if ($TimeoutSeconds -lt 15) { $TimeoutSeconds = 15 }

$Url = 'http://127.0.0.1:8188'
$PidFile = Join-Path $Root '.comfyui.pid'
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-ComfyUI {
  try {
    $response = Invoke-WebRequest -Uri "$Url/system_stats" -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Show-UI {
  if ($Service) { return }
  try { Start-Process $Url | Out-Null } catch { }
}

if (Test-ComfyUI) {
  Write-Host "ComfyUI is already running at $Url"
  Show-UI
  exit 0
}

$Python = Join-Path $Root 'python_embeded\python.exe'
$Main = Join-Path $Root 'ComfyUI\main.py'
if (-not (Test-Path $Python)) { throw "Missing embedded Python: $Python" }
if (-not (Test-Path $Main)) { throw "Missing ComfyUI main.py: $Main" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outLog = Join-Path $LogDir "comfyui-$stamp.out.log"
$errLog = Join-Path $LogDir "comfyui-$stamp.err.log"
$process = $null

try {
  Write-Host "Starting ComfyUI from $Root ..."
  Write-Host "Log: $outLog"
  $process = Start-Process -FilePath $Python `
    -ArgumentList @('-s', 'ComfyUI\main.py', '--windows-standalone-build', '--listen', '127.0.0.1', '--port', '8188') `
    -WorkingDirectory $Root -WindowStyle Hidden `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
  Set-Content -Path $PidFile -Value $process.Id -Encoding Ascii

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 1000
    if ($process.HasExited) {
      $tail = ''
      if (Test-Path $errLog) { $tail = (Get-Content $errLog -Tail 15) -join "`n" }
      throw "ComfyUI exited with code $($process.ExitCode).`n$tail"
    }
    if (Test-ComfyUI) {
      Write-Host "ComfyUI is ready at $Url"
      Show-UI
      exit 0
    }
  }
  throw "Timed out after $TimeoutSeconds seconds waiting for $Url. See $outLog and $errLog."
} catch {
  if ($process -and -not $process.HasExited) {
    & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host ""
  Write-Host "ComfyUI failed to start:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "Logs: $LogDir" -ForegroundColor Yellow
  exit 1
}
