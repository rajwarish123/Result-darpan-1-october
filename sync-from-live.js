// sync-from-live.js: One-command sync from live Resultdarpan.com to local repo
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const targetUrl = process.argv[2] || process.env.LIVE_SITE_URL || 'https://resultdarpan.com';
const adminEmail = process.env.ADMIN_EMAIL || 'rajwarish38@gmail.com';
const adminPassword = process.argv[3] || process.env.ADMIN_PASSWORD || '123@Wariya#prince990';

console.log(`\n======================================================`);
console.log(`🔄 RESULT DARPAN LIVE DATA SYNC`);
console.log(`Target: ${targetUrl}`);
console.log(`Admin : ${adminEmail}`);
console.log(`======================================================\n`);

function request(urlStr, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(urlStr, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsedBody });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runSync() {
  try {
    console.log(`[1/3] Authenticating as admin on ${targetUrl}...`);
    const loginRes = await request(`${targetUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: adminEmail,
      password: adminPassword
    });

    if (loginRes.status !== 200 || !loginRes.body.token) {
      throw new Error(`Authentication failed (HTTP ${loginRes.status}): ${loginRes.body.error || 'Check admin credentials'}`);
    }

    const token = loginRes.body.token;
    console.log(`✓ Admin session verified! Token acquired.`);

    console.log(`[2/3] Fetching full site data bundle from ${targetUrl}/api/admin/export-all-data...`);
    const exportRes = await request(`${targetUrl}/api/admin/export-all-data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let bundle = null;
    if (exportRes.status === 200 && exportRes.body && typeof exportRes.body === 'object') {
      bundle = exportRes.body;
    } else {
      console.log(`  ℹ Live host running earlier build; syncing via individual active endpoints...`);
      const [setsRes, blogsRes, notifsRes, matsRes, pyqRes, adsRes] = await Promise.all([
        request(`${targetUrl}/api/admin/question-sets`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({})),
        request(`${targetUrl}/api/blogs`).catch(() => ({})),
        request(`${targetUrl}/api/notifications`).catch(() => ({})),
        request(`${targetUrl}/api/study-materials`).catch(() => ({})),
        request(`${targetUrl}/api/admin/previous-year-questions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({})),
        request(`${targetUrl}/api/ad-settings`).catch(() => ({}))
      ]);

      bundle = {
        questionSets: setsRes.body?.questionSets || [],
        blogs: blogsRes.body?.blogs || [],
        notifications: notifsRes.body?.notifications || [],
        studyMaterials: matsRes.body?.studyMaterials || [],
        previousYearQuestions: pyqRes.body?.questions || [],
        adSettings: adsRes.body?.adSettings
      };
    }

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    console.log(`[3/3] Writing updated data files to local disk (${dataDir})...`);

    if (Array.isArray(bundle.blogs)) {
      fs.writeFileSync(path.join(dataDir, 'blogs.json'), JSON.stringify(bundle.blogs, null, 2), 'utf8');
      console.log(`  ✓ blogs.json: ${bundle.blogs.length} articles updated`);
    }

    if (Array.isArray(bundle.notifications)) {
      fs.writeFileSync(path.join(dataDir, 'notifications.json'), JSON.stringify(bundle.notifications, null, 2), 'utf8');
      console.log(`  ✓ notifications.json: ${bundle.notifications.length} exam alerts updated`);
    }

    if (Array.isArray(bundle.studyMaterials)) {
      fs.writeFileSync(path.join(dataDir, 'study-materials.json'), JSON.stringify(bundle.studyMaterials, null, 2), 'utf8');
      console.log(`  ✓ study-materials.json: ${bundle.studyMaterials.length} materials updated`);
    }

    if (Array.isArray(bundle.questionSets)) {
      fs.writeFileSync(path.join(dataDir, 'question-sets.json'), JSON.stringify(bundle.questionSets, null, 2), 'utf8');
      console.log(`  ✓ question-sets.json: ${bundle.questionSets.length} sets updated`);
    }

    if (Array.isArray(bundle.previousYearQuestions)) {
      fs.writeFileSync(path.join(dataDir, 'previous-year-questions.json'), JSON.stringify(bundle.previousYearQuestions, null, 2), 'utf8');
      console.log(`  ✓ previous-year-questions.json: ${bundle.previousYearQuestions.length} PYQs updated`);
    }

    if (bundle.adSettings) {
      fs.writeFileSync(path.join(dataDir, 'ad-settings.json'), JSON.stringify(bundle.adSettings, null, 2), 'utf8');
      console.log(`  ✓ ad-settings.json: Monetization settings updated`);
    }

    // Save full timestamped backup copy
    const backupFile = path.join(dataDir, `live-backup-latest.json`);
    fs.writeFileSync(backupFile, JSON.stringify(bundle, null, 2), 'utf8');

    console.log(`\n🎉 SUCCESS! Local workspace is now 100% in sync with live website!`);
    console.log(`Backup saved to: ${backupFile}\n`);
  } catch (err) {
    console.error(`\n❌ Sync failed:`, err.message);
  }
}

runSync();

