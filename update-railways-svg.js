const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'images', 'logos', 'railways.png');
const svgPath = path.join(__dirname, 'images', 'logos', 'railways.svg');

const b64 = fs.readFileSync(pngPath).toString('base64');
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1016 1024" width="100%" height="100%">
  <image width="1016" height="1024" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`;

fs.writeFileSync(svgPath, svgContent, 'utf8');
console.log('railways.svg successfully generated from railways.png, size:', svgContent.length);
