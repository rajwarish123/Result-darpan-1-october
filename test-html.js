const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<button class="subject-test-btn">Practice <span>→</span></article>', '<button class="subject-test-btn">Practice <span>→</span></button></article>');
html = html.replace('id="retryTest">Try again <span>↻</span></button></div>\r\n    <div class="modal-overlay', 'id="retryTest">Try again <span>↻</span></button></div></div></div>\r\n    <div class="modal-overlay');
html = html.replace('id="retryTest">Try again <span>↻</span></button></div>\n    <div class="modal-overlay', 'id="retryTest">Try again <span>↻</span></button></div></div></div>\n    <div class="modal-overlay');

const tags = [];
const regex = /<\/?([a-zA-Z0-9\-]+)[^>]*>/g;
let match;
const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
let line = 1;
let lastIndex = 0;
let errors = 0;
while ((match = regex.exec(html)) !== null) {
  const isClosing = match[0].startsWith('</');
  const isSelfClosing = match[0].endsWith('/>') || voidTags.has(match[1].toLowerCase());
  const tag = match[1].toLowerCase();
  if (voidTags.has(tag)) continue;
  if (isClosing) {
    if (tags.length === 0) {
      console.log('Extra closing tag:', tag, 'around match:', match[0].slice(0, 30));
      errors++;
    } else {
      const top = tags.pop();
      if (top.tag !== tag) {
        console.log('Mismatched tag: expected', top.tag, 'from line', top.line, 'but got', tag, 'at match:', match[0].slice(0, 30));
        errors++;
      }
    }
  } else if (!isSelfClosing) {
    const linesUpTo = html.slice(lastIndex, match.index).split('\n').length - 1;
    line += linesUpTo;
    lastIndex = match.index;
    tags.push({ tag, line });
  }
}
console.log('Total errors:', errors);
console.log('Remaining unclosed tags count:', tags.length);
if (tags.length > 0) console.log(tags);
