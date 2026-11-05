# PowerShell script to update Windows port 80 forwarding to WSL
# Run this in an Administrator PowerShell window if you want http://fastfood.localhost without a port.
$ErrorActionPreference = "Stop"

$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
if (-not $wslIp) {
    Write-Error "Could not detect WSL IP address."
    exit 1
}

Write-Host "Detected WSL IP: $wslIp"
Write-Host "Setting up port 80 proxy (127.0.0.1:80 -> $wslIp:80)..."
netsh interface portproxy set v4tov4 listenaddress=127.0.0.1 listenport=80 connectaddress=$wslIp connectport=80

Write-Host "`nCurrent portproxy rules:"
netsh interface portproxy show all
Write-Host "`nPort 80 proxy successfully configured to WSL!"
