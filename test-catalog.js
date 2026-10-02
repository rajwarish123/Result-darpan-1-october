const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Simple DOM mock to test catalog logic against index.html
function extractCards() {
  const cardRegex = /<article class="test-card"([^>]*)>([\s\S]*?)<\/article>/g;
  const cards = [];
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const catMatch = attrs.match(/data-category="([^"]+)"/);
    const popMatch = attrs.match(/data-popular="([^"]+)"/);
    const idMatch = attrs.match(/data-exam-id="([^"]+)"/);
    const titleMatch = body.match(/<h3>([^<]+)<\/h3>/);
    cards.push({
      dataset: {
        category: catMatch ? catMatch[1] : '',
        popular: popMatch ? popMatch[1] : 'false',
        examId: idMatch ? idMatch[1] : ''
      },
      textContent: titleMatch ? titleMatch[1] : '',
      style: {
        display: '',
        setProperty: function(prop, val) { this[prop] = val; }
      },
      classList: {
        add: function(c) { this[c] = true; },
        remove: function(c) { delete this[c]; }
      },
      hidden: false,
      removeAttribute: function(a) { delete this[a]; },
      setAttribute: function(a, v) { this[a] = v; }
    });
  }
  return cards;
}

const allCards = extractCards();
console.log('Total extracted test cards from index.html:', allCards.length);

function simulateFilter(activeCat, isExpanded, query) {
  const isSearching = query.length > 0;
  let visibleCount = 0;
  const visibleCards = [];

  allCards.forEach((card) => {
    const cat = (card.dataset.category || '').toLowerCase();
    const isPop = card.dataset.popular === 'true';
    const text = (card.textContent || '').toLowerCase();

    const matchesCat = activeCat === 'all' || cat === activeCat;
    const matchesQuery = !isSearching || text.indexOf(query) !== -1;

    let show = false;
    if (isSearching) {
      show = matchesCat && matchesQuery;
    } else if (activeCat === 'all') {
      show = isExpanded ? true : isPop;
    } else {
      show = cat === activeCat;
    }

    if (show) {
      card.hidden = false;
      card.style.setProperty('display', 'flex');
      visibleCount++;
      visibleCards.push(card.dataset.examId);
    } else {
      card.hidden = true;
      card.style.setProperty('display', 'none');
    }
  });

  return { visibleCount, visibleCards };
}

// Test 1: Initial state on All Exams
let res = simulateFilter('all', false, '');
console.log('Test 1 (Initial All Exams):', res.visibleCount, 'visible (Expected: 6)', res.visibleCards);
if (res.visibleCount !== 6) throw new Error('Test 1 failed');

// Test 2: Expanded All Exams
res = simulateFilter('all', true, '');
console.log('Test 2 (Expanded All Exams):', res.visibleCount, 'visible (Expected: 28)');
if (res.visibleCount !== 28) throw new Error('Test 2 failed');

// Test 3: College / Entrance
res = simulateFilter('college', false, '');
console.log('Test 3 (College / Entrance):', res.visibleCount, 'visible (Expected: 7)', res.visibleCards);
if (res.visibleCount !== 7) throw new Error('Test 3 failed');

// Test 4: Banking
res = simulateFilter('banking', false, '');
console.log('Test 4 (Banking):', res.visibleCount, 'visible (Expected: 5)', res.visibleCards);
if (res.visibleCount !== 5) throw new Error('Test 4 failed');

// Test 5: Railways
res = simulateFilter('railways', false, '');
console.log('Test 5 (Railways):', res.visibleCount, 'visible (Expected: 3)', res.visibleCards);
if (res.visibleCount !== 3) throw new Error('Test 5 failed');

// Test 6: SSC
res = simulateFilter('ssc', false, '');
console.log('Test 6 (SSC):', res.visibleCount, 'visible (Expected: 4)', res.visibleCards);
if (res.visibleCount !== 4) throw new Error('Test 6 failed');

// Test 7: Civil Services
res = simulateFilter('civil', false, '');
console.log('Test 7 (Civil Services):', res.visibleCount, 'visible (Expected: 3)', res.visibleCards);
if (res.visibleCount !== 3) throw new Error('Test 7 failed');

// Test 8: Defence
res = simulateFilter('defence', false, '');
console.log('Test 8 (Defence):', res.visibleCount, 'visible (Expected: 3)', res.visibleCards);
if (res.visibleCount !== 3) throw new Error('Test 8 failed');

// Test 9: Teaching
res = simulateFilter('teaching', false, '');
console.log('Test 9 (Teaching):', res.visibleCount, 'visible (Expected: 3)', res.visibleCards);
if (res.visibleCount !== 3) throw new Error('Test 9 failed');

// Test 10: Search "jee"
res = simulateFilter('all', false, 'jee');
console.log('Test 10 (Search "jee"):', res.visibleCount, 'visible (Expected: 2)', res.visibleCards);
if (res.visibleCount !== 2) throw new Error('Test 10 failed');

// Test 11: Search "ntpc"
res = simulateFilter('all', false, 'ntpc');
console.log('Test 11 (Search "ntpc"):', res.visibleCount, 'visible (Expected: 1)', res.visibleCards);
if (res.visibleCount !== 1) throw new Error('Test 11 failed');

// Test 12: Search "clerk"
res = simulateFilter('all', false, 'clerk');
console.log('Test 12 (Search "clerk"):', res.visibleCount, 'visible (Expected: 2)', res.visibleCards);
if (res.visibleCount !== 2) throw new Error('Test 12 failed');

console.log('\n>>> ALL 12 CATALOG BEHAVIOR TESTS PASSED PERFECTLY! <<<');
