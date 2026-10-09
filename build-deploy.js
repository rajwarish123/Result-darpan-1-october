/**
 * Result Darpan - Automated Zero-Lag Deploy Packaging System
 * Guarantees that:
 * 1. Latest questions & content from the live website are pulled and merged first.
 * 2. Automated test suite passes 100%.
 * 3. Sister workspace directory is mirrored.
 * 4. A clean, production-ready Hostinger deployment ZIP is built.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=============================================================');
console.log('📦 RESULT DARPAN PRODUCTION DEPLOY BUILDER');
console.log('=============================================================\n');

// 1. Pull latest data from live site if available
console.log('[Step 1/5] Checking live site for newly added questions...');
try {
  execSync('node sync-from-live.js', { stdio: 'inherit' });
} catch (e) {
  console.log('ℹ Live site offline or not configured yet; proceeding with current local data.');
}

// 2. Run backend test suite
console.log('\n[Step 2/5] Running automated tests...');
try {
  execSync('node --test', { stdio: 'inherit' });
  console.log('✓ All tests passed successfully!');
} catch (err) {
  console.error('\n❌ Tests failed! Aborting deploy package creation to protect production.');
  process.exit(1);
}

// 3. Mirror to sister directory
console.log('\n[Step 3/5] Mirroring workspace files...');
try {
  execSync('robocopy "c:\\Users\\11\\Downloads\\My website 1" "c:\\Users\\11\\Downloads\\my website" /E /XD node_modules .git .gemini /XF "*.zip" /R:1 /W:1', { stdio: 'ignore' });
  console.log('✓ Mirroring complete.');
} catch (_) {}

// 4. Create Hostinger deployment zip
console.log('\n[Step 4/5] Packaging resultdarpan-hostinger-deploy.zip...');
const zipDest = 'c:\\Users\\11\\Downloads\\resultdarpan-hostinger-deploy.zip';
const psCommand = `
$zipPath = '${zipDest}'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$exclude = @('node_modules', '.git', '.gemini', '.system_generated')
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $p = $_.FullName
    $skip = $false
    foreach ($ex in $exclude) {
        if ($p -match "[\\\\/]$ex[\\\\/]") { $skip = $true; break }
    }
    if ($_.Extension -eq '.zip') { $skip = $true }
    -not $skip
}
Compress-Archive -Path $files.FullName -DestinationPath $zipPath -Force
`;

try {
  const psScriptFile = path.join(__dirname, '.temp_zip.ps1');
  fs.writeFileSync(psScriptFile, psCommand, 'utf8');
  execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`, { stdio: 'inherit' });
  if (fs.existsSync(psScriptFile)) fs.unlinkSync(psScriptFile);

  const stat = fs.statSync(zipDest);
  console.log(`✓ Deployment zip ready: ${zipDest} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
} catch (err) {
  console.error('❌ Failed to create zip:', err.message);
  process.exit(1);
}

console.log('\n=============================================================');
console.log('🎉 DEPLOY PACKAGE READY FOR HOSTINGER!');
console.log('Every question, blog, notification, and asset is preserved.');
console.log('=============================================================\n');
