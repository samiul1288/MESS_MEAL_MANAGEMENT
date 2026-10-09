$p = "d:\next-level\mess meal management"
Set-Location $p
node src/server.js > server_test4.log 2>&1
Write-Host "Server exit code: $LASTEXITCODE"
Get-Content server_test4.log
