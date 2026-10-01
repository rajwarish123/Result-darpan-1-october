/**
 * Result Darpan - Real-Time Git Auto-Sync System
 * Watches for file edits in the workspace and automatically commits & pushes
 * to GitHub (https://github.com/rajwarish123/Result-darpan-1-october) in real time.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const WORKSPACE_DIR = __dirname;
const DEBOUNCE_MS = 3000; // Wait 3 seconds of inactivity after last edit before pushing

// Excluded directories and patterns
const IGNORED_PATHS = [
  '.git',
  'node_modules',
  '.vscode',
  '.gemini',
  '.system_generated',
  'temp',
  'tmp'
];

const IGNORED_EXTENSIONS = [
  '.tmp',
  '.swp',
  '.bak',
  '~',
  '.zip'
];

// Ensure Git binaries are in process.env.PATH
const gitPaths = [
  'C:\\Users\\11\\AppData\\Local\\GitHubDesktop\\app-3.6.6\\resources\\app\\git\\cmd',
  'C:\\Users\\11\\AppData\\Local\\GitHubDesktop\\app-3.6.6\\resources\\app\\git\\mingw64\\bin'
];
for (const p of gitPaths) {
  if (fs.existsSync(p) && !process.env.PATH.includes(p)) {
    process.env.PATH = `${p};${process.env.PATH}`;
  }
}

// Locate git binary
function getGitExecutable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return 'git';
  } catch (e) {
    const fallback = 'C:\\Users\\11\\AppData\\Local\\GitHubDesktop\\app-3.6.6\\resources\\app\\git\\cmd\\git.exe';
    if (fs.existsSync(fallback)) return `"${fallback}"`;
    return 'git';
  }
}

const GIT_CMD = getGitExecutable();

function log(msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: true });
  console.log(`[${time}] ${msg}`);
}

function shouldIgnore(relativePath) {
  if (!relativePath) return true;
  const normalized = relativePath.replace(/\\/g, '/');
  for (const ignored of IGNORED_PATHS) {
    if (normalized === ignored || normalized.startsWith(ignored + '/')) {
      return true;
    }
  }
  for (const ext of IGNORED_EXTENSIONS) {
    if (normalized.endsWith(ext)) return true;
  }
  return false;
}

let changedFiles = new Set();
let debounceTimer = null;
let isSyncing = false;
let queuedSync = false;

function scheduleSync() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    performSync();
  }, DEBOUNCE_MS);
}

function performSync() {
  if (isSyncing) {
    queuedSync = true;
    return;
  }

  isSyncing = true;
  const filesList = Array.from(changedFiles);
  changedFiles.clear();

  log(`⚡ Change detected in: ${filesList.slice(0, 4).join(', ')}${filesList.length > 4 ? ` (+${filesList.length - 4} more)` : ''}`);
  log('📦 Staging files for Git...');

  exec(`${GIT_CMD} add -A`, { cwd: WORKSPACE_DIR }, (addErr) => {
    if (addErr) {
      log(`⚠️ git add error: ${addErr.message}`);
      isSyncing = false;
      return;
    }

    exec(`${GIT_CMD} status --porcelain`, { cwd: WORKSPACE_DIR }, (statusErr, stdout) => {
      if (statusErr || !stdout.trim()) {
        log('ℹ️ No staged differences to commit.');
        isSyncing = false;
        if (queuedSync) {
          queuedSync = false;
          scheduleSync();
        }
        return;
      }

      const fileSummary = filesList.length > 0 
        ? filesList.slice(0, 3).map(f => path.basename(f)).join(', ') + (filesList.length > 3 ? ` (+${filesList.length - 3})` : '')
        : 'workspace updates';
      
      const commitMsg = `Auto-sync: ${fileSummary} [${new Date().toLocaleTimeString()}]`;

      exec(`${GIT_CMD} commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: WORKSPACE_DIR }, (commitErr) => {
        if (commitErr) {
          log(`⚠️ git commit error: ${commitErr.message}`);
          isSyncing = false;
          return;
        }

        log(`🚀 Pushing changes to GitHub (origin/main)...`);
        exec(`${GIT_CMD} push origin main`, { cwd: WORKSPACE_DIR }, (pushErr, pushOut, pushStderr) => {
          if (pushErr) {
            log(`❌ git push failed: ${pushStderr || pushErr.message}`);
          } else {
            log(`✅ Successfully synced to GitHub! (${commitMsg})`);
          }

          isSyncing = false;
          if (queuedSync) {
            queuedSync = false;
            log('🔄 Triggering sync for changes made during previous push...');
            scheduleSync();
          }
        });
      });
    });
  });
}

// Start watcher
log('🟢 Result Darpan Git Auto-Sync is ACTIVE');
log(`📂 Watching workspace: ${WORKSPACE_DIR}`);
log(`⏱️ Auto-push debounce: ${DEBOUNCE_MS / 1000}s after edits`);
log('📡 Connected repository: https://github.com/rajwarish123/Result-darpan-1-october');

try {
  fs.watch(WORKSPACE_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename || shouldIgnore(filename)) return;
    changedFiles.add(filename);
    scheduleSync();
  });
} catch (e) {
  log(`⚠️ Recursive watch error, falling back to top-level watch: ${e.message}`);
  fs.watch(WORKSPACE_DIR, (eventType, filename) => {
    if (!filename || shouldIgnore(filename)) return;
    changedFiles.add(filename);
    scheduleSync();
  });
}

// Initial sync on startup
scheduleSync();

