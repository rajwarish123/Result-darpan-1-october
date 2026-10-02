const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(/href="\/"/g, 'href="index.html"');
  content = content.replace(/href="\/#/g, 'href="index.html#');
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated links in:', file);
  }
});
