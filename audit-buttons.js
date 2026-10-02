const fs = require('fs');

const files = ['index.html', 'class-series.html', 'blogs.html', 'notifications.html'];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n=================== ${file} ===================`);
  
  // Find all buttons
  const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let match;
  let buttonCount = 0;
  while ((match = buttonRegex.exec(content)) !== null) {
    buttonCount++;
    const attrs = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim().slice(0, 30);
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const classMatch = attrs.match(/class=["']([^"']+)["']/i);
    const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
    console.log(`  BUTTON #${buttonCount}: id="${idMatch ? idMatch[1] : ''}" class="${classMatch ? classMatch[1] : ''}" type="${typeMatch ? typeMatch[1] : ''}" text="${text}"`);
  }

  // Find all a.btn or a.primary-btn or CTA links
  const ctaRegex = /<a\b([^>]*class=["'][^"']*(?:btn|cta)[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let ctaCount = 0;
  while ((match = ctaRegex.exec(content)) !== null) {
    ctaCount++;
    const attrs = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim().slice(0, 30);
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    const classMatch = attrs.match(/class=["']([^"']+)["']/i);
    console.log(`  CTA LINK #${ctaCount}: href="${hrefMatch ? hrefMatch[1] : ''}" class="${classMatch ? classMatch[1] : ''}" text="${text}"`);
  }
});
