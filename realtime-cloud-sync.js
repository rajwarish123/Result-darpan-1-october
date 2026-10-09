/**
 * Result Darpan - Real-Time Cloud Synchronization Engine
 * Automatically synchronizes Question Sets, Blogs, Notifications, Study Materials,
 * and PYQs between the Live Production Domain (https://resultdarpan.com) and the Local Workspace in Real Time.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LIVE_URL = (process.env.LIVE_SITE_URL || 'https://resultdarpan.com').replace(/\/+$/, '');
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const MIRROR_DATA_DIR = path.resolve(__dirname, '../my website/data');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rajwarish38@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123@Wariya#prince990';
const POLL_INTERVAL_MS = 15000; // 15s heartbeat fallback

let liveAdminToken = null;
let lastKnownVersion = null;
let isSyncing = false;

function log(msg) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: true });
  console.log(`[Realtime Sync ${ts}] ${msg}`);
}

function request(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.request(urlStr, {
        timeout: 10000,
        ...options
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: json });
          } catch (_) {
            resolve({ status: res.statusCode, headers: res.headers, raw: body });
          }
        });
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });
      req.on('error', reject);
      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function getLiveAuthToken() {
  if (liveAdminToken) return liveAdminToken;
  try {
    const res = await request(`${LIVE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (res.status === 200 && res.body?.token) {
      liveAdminToken = res.body.token;
      return liveAdminToken;
    }
  } catch (err) {
    // If live site is not yet reachable (e.g. offline or DNS resolving), fail gracefully
  }
  return null;
}

function saveToDisk(filename, data) {
  const localFile = path.join(LOCAL_DATA_DIR, filename);
  const jsonStr = JSON.stringify(data, null, 2);
  
  // Only write if content actually changed to avoid spurious disk I/O
  let existing = '';
  try {
    if (fs.existsSync(localFile)) {
      existing = fs.readFileSync(localFile, 'utf8');
    }
  } catch (_) {}

  if (existing.trim() !== jsonStr.trim()) {
    fs.writeFileSync(localFile, jsonStr, 'utf8');
    log(`✓ Updated ${filename} on local workspace`);

    // Also mirror to sister folder if exists
    try {
      if (fs.existsSync(MIRROR_DATA_DIR)) {
        fs.writeFileSync(path.join(MIRROR_DATA_DIR, filename), jsonStr, 'utf8');
      }
    } catch (_) {}
    return true;
  }
  return false;
}

async function pullFromLive() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const token = await getLiveAuthToken();
    if (!token) return;

    const res = await request(`${LIVE_URL}/api/admin/export-all-data`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      liveAdminToken = null; // Token expired, reset for next re-auth
      return;
    }

    if (res.status !== 200 || !res.body) return;

    const bundle = res.body;
    let changesMade = 0;

    if (Array.isArray(bundle.questionSets)) {
      if (saveToDisk('question-sets.json', bundle.questionSets)) changesMade++;
    }
    if (Array.isArray(bundle.blogs)) {
      if (saveToDisk('blogs.json', bundle.blogs)) changesMade++;
    }
    if (Array.isArray(bundle.notifications)) {
      if (saveToDisk('notifications.json', bundle.notifications)) changesMade++;
    }
    if (Array.isArray(bundle.studyMaterials)) {
      if (saveToDisk('study-materials.json', bundle.studyMaterials)) changesMade++;
    }
    if (Array.isArray(bundle.previousYearQuestions)) {
      if (saveToDisk('previous-year-questions.json', bundle.previousYearQuestions)) changesMade++;
    }
    if (bundle.adSettings) {
      if (saveToDisk('ad-settings.json', bundle.adSettings)) changesMade++;
    }

    if (changesMade > 0) {
      log(`⚡ Real-time Sync complete: ${changesMade} datasets updated from live website!`);
    }
  } catch (err) {
    // Network hiccup - ignore and retry next cycle
  } finally {
    isSyncing = false;
  }
}

async function checkVersionAndSync() {
  try {
    const res = await request(`${LIVE_URL}/api/sync/version`, { method: 'GET' });
    if (res.status === 200 && res.body?.version) {
      const liveVer = res.body.version;
      const liveLastUpdated = liveVer.lastUpdated || 0;

      if (!lastKnownVersion || liveLastUpdated > (lastKnownVersion.lastUpdated || 0)) {
        lastKnownVersion = liveVer;
        await pullFromLive();
      }
    }
  } catch (_) {
    // Live host unavailable / offline; silently back off
  }
}

function startSseStream() {
  try {
    const parsed = new URL(`${LIVE_URL}/api/sync/stream`);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(parsed, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        setTimeout(startSseStream, 15000);
        return;
      }

      log(`Connected to live stream at ${LIVE_URL}/api/sync/stream`);

      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              if (data.entity) {
                log(`⚡ Incoming real-time change event: [${data.entity}]`);
                pullFromLive();
              }
            } catch (_) {}
          }
        }
      });

      res.on('end', () => {
        log('Stream ended. Reconnecting in 10s...');
        setTimeout(startSseStream, 10000);
      });
    });

    req.on('error', () => {
      setTimeout(startSseStream, 15000);
    });

    req.end();
  } catch (_) {
    setTimeout(startSseStream, 15000);
  }
}

// Watch local data/ folder so local admin edits push to live as well!
let localPushDebounce = null;
function setupLocalWatcher() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) return;

  fs.watch(LOCAL_DATA_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json') || filename.includes('backup')) return;
    if (isSyncing) return;

    clearTimeout(localPushDebounce);
    localPushDebounce = setTimeout(async () => {
      try {
        const token = await getLiveAuthToken();
        if (!token) return;

        const payload = {};
        if (fs.existsSync(path.join(LOCAL_DATA_DIR, 'question-sets.json'))) {
          payload.questionSets = JSON.parse(fs.readFileSync(path.join(LOCAL_DATA_DIR, 'question-sets.json'), 'utf8'));
        }
        if (fs.existsSync(path.join(LOCAL_DATA_DIR, 'blogs.json'))) {
          payload.blogs = JSON.parse(fs.readFileSync(path.join(LOCAL_DATA_DIR, 'blogs.json'), 'utf8'));
        }
        if (fs.existsSync(path.join(LOCAL_DATA_DIR, 'notifications.json'))) {
          payload.notifications = JSON.parse(fs.readFileSync(path.join(LOCAL_DATA_DIR, 'notifications.json'), 'utf8'));
        }
        if (fs.existsSync(path.join(LOCAL_DATA_DIR, 'study-materials.json'))) {
          payload.studyMaterials = JSON.parse(fs.readFileSync(path.join(LOCAL_DATA_DIR, 'study-materials.json'), 'utf8'));
        }

        const pushRes = await request(`${LIVE_URL}/api/sync/merge-bundle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }, payload);

        if (pushRes.status === 200 && pushRes.body?.success) {
          log(`✓ Pushed local updates to live server ${LIVE_URL}`);
        }
      } catch (_) {}
    }, 3000);
  });
}

console.log(`\n=============================================================`);
console.log(`🚀 RESULT DARPAN REAL-TIME CLOUD SYNC DAEMON ACTIVE`);
console.log(`Live Endpoint  : ${LIVE_URL}`);
console.log(`Local Storage  : ${LOCAL_DATA_DIR}`);
console.log(`Heartbeat Poll : every ${POLL_INTERVAL_MS / 1000}s`);
console.log(`=============================================================\n`);

// Initialize
checkVersionAndSync();
setInterval(checkVersionAndSync, POLL_INTERVAL_MS);
startSseStream();
setupLocalWatcher();
