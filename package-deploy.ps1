$zipPath = "c:\Users\11\Downloads\resultdarpan-hostinger-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$exclude = @('node_modules', '.git', '.gemini', '.system_generated')
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($ex in $exclude) {
        if ($path -match "[\\/]$ex[\\/]") { $skip = $true; break }
    }
    if ($_.Extension -eq '.zip') { $skip = $true }
    -not $skip
}
Compress-Archive -Path $files.FullName -DestinationPath $zipPath -Force
$size = (Get-Item $zipPath).Length
Write-Host "Created $zipPath ($size bytes)"
