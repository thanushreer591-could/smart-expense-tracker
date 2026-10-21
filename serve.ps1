# ============================================================
#  serve.ps1  —  tiny local web server for Smart Expense Tracker
#  Usage (in this folder):
#      powershell -ExecutionPolicy Bypass -File .\serve.ps1
#  Then open:  http://localhost:8000
#  Stop with:  Ctrl + C
#  No installs needed. Works on Windows 11 with built-in PowerShell.
# ============================================================

param([int]$Port = 8000)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Host "Could not start on port $Port. Is it already in use? Try:  .\serve.ps1 -Port 8080" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  Smart Expense Tracker is being served" -ForegroundColor Green
Write-Host "  Folder : $root"
Write-Host "  Open   : http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Stop   : press Ctrl + C"
Write-Host ""

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000

    # Read the request line + headers.
    $buffer = New-Object byte[] 8192
    $sb = New-Object System.Text.StringBuilder
    do {
      $read = $stream.Read($buffer, 0, $buffer.Length)
      if ($read -le 0) { break }
      [void]$sb.Append([System.Text.Encoding]::ASCII.GetString($buffer, 0, $read))
    } while ($stream.DataAvailable)

    $request = $sb.ToString()
    $firstLine = ($request -split "`r`n")[0]
    $parts = $firstLine -split ' '
    $urlPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $urlPath = $urlPath.Split('?')[0].TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = 'index.html' }

    $file = Join-Path $root ($urlPath -replace '/', '\')

    if (Test-Path $file -PathType Leaf) {
      $body = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }

      $header = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-store`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
      Write-Host "  200  /$urlPath" -ForegroundColor DarkGray
    } else {
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: /$urlPath")
      $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($msg, 0, $msg.Length)
      Write-Host "  404  /$urlPath" -ForegroundColor DarkYellow
    }
    $stream.Flush()
  } catch {
    # Ignore a single bad request and keep serving.
  } finally {
    $client.Close()
  }
}
