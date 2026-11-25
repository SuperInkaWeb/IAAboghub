Write-Host "Iniciando Tunel HTTPS temporal para Demo desde tu Laptop (Puerto 8000)..." -ForegroundColor Cyan
npx --yes cloudflared tunnel --url http://127.0.0.1:8000
