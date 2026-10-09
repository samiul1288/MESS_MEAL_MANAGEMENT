$base = "d:\next-level\mess meal management"
$f = Join-Path $base "src\routes\reports.js"
Write-Host "FILE EXISTS: $(Test-Path $f)"
$content = Get-Content $f -Raw
Write-Host "RAW LENGTH: $($content.Length)"
$lines = $content -split "`n"
Write-Host "LINE COUNT: $($lines.Length)"
for ($i = 0; $i -lt $lines.Length; $i++) {
    $lineNum = $i + 1
    $line = $lines[$i]
    Write-Host "LINE $lineNum: $line"
}
