const fs = require('fs');

fs.readdirSync('.').filter(f => f.endsWith('.html')).forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const navMatch = c.match(/<nav class=["']main-nav["'][^>]*>([\s\S]*?)<\/nav>/i);
  const actionsMatch = c.match(/<div class=["']nav-actions["'][^>]*>([\s\S]*?)<\/div>/i);
  console.log(`=== ${f} ===`);
  console.log('NAV:', navMatch ? navMatch[1].replace(/\s+/g, ' ').trim() : 'NONE');
  console.log('ACTIONS:', actionsMatch ? actionsMatch[1].replace(/\s+/g, ' ').trim() : 'NONE');
  console.log('SCRIPTS:', (c.match(/<script[^>]*src=["']([^"']+)["']/g) || []).join(', '));
  console.log('--------------------------------------------------');
});
