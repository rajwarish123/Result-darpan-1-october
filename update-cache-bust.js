const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Update local CSS files
  content = content.replace(/(href=["'])([^"':?#]+\.css)(?:\?[^"']*)?(["'])/gi, (match, prefix, path, suffix) => {
    if (path.startsWith('http') || path.startsWith('//')) return match;
    changed = true;
    return `${prefix}${path}?v=5.2${suffix}`;
  });

  // Update local JS files
  content = content.replace(/(src=["'])([^"':?#]+\.js)(?:\?[^"']*)?(["'])/gi, (match, prefix, path, suffix) => {
    if (path.startsWith('http') || path.startsWith('//')) return match;
    changed = true;
    return `${prefix}${path}?v=5.2${suffix}`;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated cache busting in ${file}`);
  }
});
