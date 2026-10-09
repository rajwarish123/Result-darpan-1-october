
$stage = 'C:\\Users\\11\\AppData\\Local\\Temp\\resultdarpan_hostinger_stage'
$zipPath = 'c:\\Users\\11\\Downloads\\resultdarpan-hostinger-deploy.zip'

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $stage -Force | Out-Null

robocopy "c:\Users\11\Downloads\My website 1" $stage /E /XD node_modules .git .gemini .system_generated /XF "*.zip" ".temp*" "*.log" /R:1 /W:1 | Out-Null

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipPath)

Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
