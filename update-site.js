const fs = require('fs');

console.log('--- 1. Updating index.html ---');
let html = fs.readFileSync('index.html', 'utf8');
const isHtmlCRLF = html.includes('\r\n');
if (isHtmlCRLF) html = html.replace(/\r\n/g, '\n');

// 1a. Update <style> block in index.html
const oldCssMarker = '.test-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; gap: 20px !important; }\n    .test-card { background: #ffffff !important; border-radius: 16px !important; border: 1px solid #e2e8e4 !important; padding: 22px !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; min-height: 200px !important; box-shadow: 0 4px 16px rgba(18,45,39,0.04) !important; transition: transform 0.22s ease, box-shadow 0.22s ease !important; position: relative !important; overflow: hidden !important; box-sizing: border-box !important; }';

const newCssBlock = `/* Critical Guaranteed Hidden & Display Rules */
    [hidden],
    [hidden="true"],
    .test-card.is-catalog-hidden,
    .test-card[hidden],
    .subject-card[hidden],
    .view-all-exams-wrap[hidden],
    .catalog-search-clear[hidden],
    .catalog-empty-state[hidden] {
      display: none !important;
    }
    .test-card:not([hidden]):not(.is-catalog-hidden) {
      display: flex !important;
      flex-direction: column !important;
    }
    .test-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; gap: 20px !important; }
    .test-card { background: #ffffff !important; border-radius: 16px !important; border: 1px solid #e2e8e4 !important; padding: 22px !important; display: flex; flex-direction: column; justify-content: space-between !important; min-height: 200px !important; box-shadow: 0 4px 16px rgba(18,45,39,0.04) !important; transition: transform 0.22s ease, box-shadow 0.22s ease !important; position: relative !important; overflow: hidden !important; box-sizing: border-box !important; }`;

if (html.includes(oldCssMarker)) {
  html = html.replace(oldCssMarker, newCssBlock);
  console.log('✓ index.html <style> updated with guaranteed hidden rules');
} else {
  console.warn('! oldCssMarker not matched in index.html');
}

// 1b. Fix unclosed button on history subject card
const oldHistoryBtn = '<button class="subject-test-btn">Practice <span>\u2192</span></article>';
const newHistoryBtn = '<button class="subject-test-btn">Practice <span>\u2192</span></button></article>';
if (html.includes(oldHistoryBtn)) {
  html = html.replace(oldHistoryBtn, newHistoryBtn);
  console.log('✓ index.html history button closed properly');
}

// 1c. Close test-window and test-modal before articleReaderModal
const oldModalEnd = 'id="retryTest">Try again <span>\u21bb</span></button></div>\n    <div class="modal-overlay modal-wide" id="articleReaderModal">';
const newModalEnd = 'id="retryTest">Try again <span>\u21bb</span></button></div>\n    </div>\n  </div>\n\n  <div class="modal-overlay modal-wide" id="articleReaderModal">';
if (html.includes(oldModalEnd)) {
  html = html.replace(oldModalEnd, newModalEnd);
  console.log('✓ index.html testModal and testWindow closed cleanly before articleReaderModal');
}

// 1d. Add inline catalog controller right after viewAllExamsWrap
const viewAllWrapMarker = '</button>\n        </div>\n      </div>\n    </section>';
const inlineScript = `</button>
        </div>

        <script>
          // Self-contained instant catalog controller for guaranteed reactivity
          (function() {
            var activeCat = 'all';
            var isExpanded = false;

            function runCatalogFilter() {
              var input = document.getElementById('catalogSearchInput');
              var clearBtn = document.getElementById('catalogSearchClear');
              var emptyState = document.getElementById('catalogEmptyState');
              var emptyText = document.getElementById('emptyQueryText');
              var toggleWrap = document.getElementById('viewAllExamsWrap');
              var toggleBtn = document.getElementById('toggleAllExamsBtn');
              var cards = document.querySelectorAll('.test-card');

              var query = (input ? input.value : '').trim().toLowerCase();
              var isSearching = query.length > 0;

              if (clearBtn) {
                if (isSearching) {
                  clearBtn.hidden = false;
                  clearBtn.removeAttribute('hidden');
                  clearBtn.style.setProperty('display', 'inline-flex', 'important');
                } else {
                  clearBtn.hidden = true;
                  clearBtn.setAttribute('hidden', '');
                  clearBtn.style.setProperty('display', 'none', 'important');
                }
              }

              var visibleCount = 0;
              cards.forEach(function(card) {
                var cat = (card.dataset.category || '').toLowerCase();
                var isPop = card.dataset.popular === 'true';
                var text = (card.textContent || '').toLowerCase();

                var matchesCat = activeCat === 'all' || cat === activeCat;
                var matchesQuery = !isSearching || text.indexOf(query) !== -1;

                var show = false;
                if (isSearching) {
                  show = matchesCat && matchesQuery;
                } else if (activeCat === 'all') {
                  show = isExpanded ? true : isPop;
                } else {
                  show = cat === activeCat;
                }

                if (show) {
                  card.hidden = false;
                  card.removeAttribute('hidden');
                  card.classList.remove('is-catalog-hidden');
                  card.style.setProperty('display', 'flex', 'important');
                  visibleCount++;
                } else {
                  card.hidden = true;
                  card.setAttribute('hidden', '');
                  card.classList.add('is-catalog-hidden');
                  card.style.setProperty('display', 'none', 'important');
                }
              });

              if (emptyState) {
                if (visibleCount === 0 && isSearching) {
                  emptyState.hidden = false;
                  emptyState.removeAttribute('hidden');
                  emptyState.style.setProperty('display', 'block', 'important');
                  if (emptyText) emptyText.textContent = query;
                } else {
                  emptyState.hidden = true;
                  emptyState.setAttribute('hidden', '');
                  emptyState.style.setProperty('display', 'none', 'important');
                }
              }

              if (toggleWrap && toggleBtn) {
                if (activeCat === 'all' && !isSearching) {
                  toggleWrap.hidden = false;
                  toggleWrap.removeAttribute('hidden');
                  toggleWrap.style.setProperty('display', 'flex', 'important');
                  if (isExpanded) {
                    toggleBtn.innerHTML = '<span>Show less</span> <span class=\"btn-icon\">\u2191</span>';
                  } else {
                    toggleBtn.innerHTML = '<span>Show all ' + cards.length + ' exams</span> <span class=\"btn-icon\">\u2193</span>';
                  }
                } else {
                  toggleWrap.hidden = true;
                  toggleWrap.setAttribute('hidden', '');
                  toggleWrap.style.setProperty('display', 'none', 'important');
                }
              }
            }

            window.__applyCatalogFilters = runCatalogFilter;
            window.__setActiveCatalogCategory = function(c) { activeCat = c; isExpanded = false; runCatalogFilter(); };
            window.__toggleAllExams = function() { isExpanded = !isExpanded; runCatalogFilter(); return isExpanded; };

            document.addEventListener('click', function(e) {
              var catBtn = e.target.closest('.category');
              if (catBtn) {
                e.preventDefault();
                document.querySelectorAll('.category').forEach(function(b) { b.classList.remove('active'); });
                catBtn.classList.add('active');
                activeCat = catBtn.dataset.filter || 'all';
                isExpanded = false;
                var input = document.getElementById('catalogSearchInput');
                if (input && input.value) input.value = '';
                runCatalogFilter();
                return;
              }

              var togBtn = e.target.closest('#toggleAllExamsBtn');
              if (togBtn) {
                e.preventDefault();
                isExpanded = !isExpanded;
                runCatalogFilter();
                if (!isExpanded) {
                  var pop = document.getElementById('popular');
                  if (pop) pop.scrollIntoView({ behavior: 'smooth' });
                }
                return;
              }

              var clrBtn = e.target.closest('#catalogSearchClear');
              if (clrBtn) {
                e.preventDefault();
                var input = document.getElementById('catalogSearchInput');
                if (input) { input.value = ''; input.focus(); }
                runCatalogFilter();
                return;
              }

              var rstBtn = e.target.closest('#resetSearchBtn');
              if (rstBtn) {
                e.preventDefault();
                var input = document.getElementById('catalogSearchInput');
                if (input) input.value = '';
                document.querySelectorAll('.category').forEach(function(b) { b.classList.remove('active'); });
                var allBtn = document.querySelector('.category[data-filter=\"all\"]');
                if (allBtn) allBtn.classList.add('active');
                activeCat = 'all';
                isExpanded = false;
                runCatalogFilter();
                return;
              }
            });

            document.addEventListener('input', function(e) {
              if (e.target && e.target.id === 'catalogSearchInput') {
                runCatalogFilter();
              }
            });

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', runCatalogFilter);
            } else {
              runCatalogFilter();
            }
          })();
        </script>
      </div>
    </section>`;

if (html.includes(viewAllWrapMarker)) {
  html = html.replace(viewAllWrapMarker, inlineScript);
  console.log('✓ index.html inline catalog controller inserted');
} else {
  console.warn('! viewAllWrapMarker not matched in index.html');
}

// 1e. Update cache busters in index.html
html = html.replace('styles.css?v=3.1', 'styles.css?v=4.0');
html = html.replace('script.js?v=3.1', 'script.js?v=4.0');

if (isHtmlCRLF) html = html.replace(/\n/g, '\r\n');
fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ index.html saved');


console.log('\n--- 2. Updating styles.css ---');
let css = fs.readFileSync('styles.css', 'utf8');
const isCssCRLF = css.includes('\r\n');
if (isCssCRLF) css = css.replace(/\r\n/g, '\n');

// Add global hidden rule at top of styles.css if not present
if (!css.includes('.test-card.is-catalog-hidden')) {
  const globalHiddenCss = `/* Guaranteed Hidden Elements Handling */
[hidden],
[hidden="true"],
.test-card.is-catalog-hidden,
.test-card[hidden],
.subject-card[hidden],
.view-all-exams-wrap[hidden],
.catalog-search-clear[hidden],
.catalog-empty-state[hidden] {
  display: none !important;
}

`;
  css = globalHiddenCss + css;
  console.log('✓ styles.css prepended with guaranteed hidden rules');
}

// In .test-card rule, remove !important from display: flex !important;
css = css.replace(
  /\.test-card\s*\{([^}]*?)display:\s*flex\s*!important;([^}]*?)flex-direction:\s*column\s*!important;/g,
  '.test-card {$1display: flex;$2flex-direction: column;'
);
console.log('✓ styles.css .test-card display updated to display: flex');

if (isCssCRLF) css = css.replace(/\n/g, '\r\n');
fs.writeFileSync('styles.css', css, 'utf8');
console.log('✓ styles.css saved');


console.log('\n--- 3. Updating script.js ---');
let js = fs.readFileSync('script.js', 'utf8');
const isJsCRLF = js.includes('\r\n');
if (isJsCRLF) js = js.replace(/\r\n/g, '\n');

// Replace applyCatalogFilters and related listeners in script.js
const oldCatalogBlockStart = '// --- CATALOG CONTROLLER: SEARCH, CATEGORIES, AND VIEW ALL TOGGLE ---';
const oldCatalogBlockEnd = 'applyCatalogFilters();\n\ndocument.querySelectorAll(\'.subject-test-btn\')';

const startIndex = js.indexOf(oldCatalogBlockStart);
const endIndex = js.indexOf(oldCatalogBlockEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newCatalogBlock = `// --- CATALOG CONTROLLER: SEARCH, CATEGORIES, AND VIEW ALL TOGGLE ---
let activeCatalogCategory = 'all';
let showAllExamsExpanded = false;

function applyCatalogFilters() {
  if (typeof window.__applyCatalogFilters === 'function') {
    window.__applyCatalogFilters();
    return;
  }

  const searchInput = document.getElementById('catalogSearchInput');
  const searchClear = document.getElementById('catalogSearchClear');
  const emptyState = document.getElementById('catalogEmptyState');
  const emptyQueryText = document.getElementById('emptyQueryText');
  const toggleBtn = document.getElementById('toggleAllExamsBtn');
  const toggleWrap = document.getElementById('viewAllExamsWrap');
  const allCards = document.querySelectorAll('.test-card');

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const isSearching = query.length > 0;

  if (searchClear) {
    if (isSearching) {
      searchClear.hidden = false;
      searchClear.removeAttribute('hidden');
      searchClear.style.setProperty('display', 'inline-flex', 'important');
    } else {
      searchClear.hidden = true;
      searchClear.setAttribute('hidden', '');
      searchClear.style.setProperty('display', 'none', 'important');
    }
  }

  let visibleCount = 0;

  allCards.forEach((card) => {
    const cardCat = (card.dataset.category || '').toLowerCase();
    const isPopular = card.dataset.popular === 'true';
    const text = (card.textContent || '').toLowerCase();

    const matchesCategory = activeCatalogCategory === 'all' || cardCat === activeCatalogCategory;
    const matchesQuery = !isSearching || text.includes(query);

    let shouldShow = false;
    if (isSearching) {
      shouldShow = matchesCategory && matchesQuery;
    } else if (activeCatalogCategory === 'all') {
      shouldShow = showAllExamsExpanded ? true : isPopular;
    } else {
      shouldShow = cardCat === activeCatalogCategory;
    }

    if (shouldShow) {
      card.hidden = false;
      card.removeAttribute('hidden');
      card.classList.remove('is-catalog-hidden');
      card.style.setProperty('display', 'flex', 'important');
      visibleCount++;
    } else {
      card.hidden = true;
      card.setAttribute('hidden', '');
      card.classList.add('is-catalog-hidden');
      card.style.setProperty('display', 'none', 'important');
    }
  });

  if (emptyState) {
    if (visibleCount === 0 && isSearching) {
      emptyState.hidden = false;
      emptyState.removeAttribute('hidden');
      emptyState.style.setProperty('display', 'block', 'important');
      if (emptyQueryText) emptyQueryText.textContent = query;
    } else {
      emptyState.hidden = true;
      emptyState.setAttribute('hidden', '');
      emptyState.style.setProperty('display', 'none', 'important');
    }
  }

  if (toggleWrap && toggleBtn) {
    if (activeCatalogCategory === 'all' && !isSearching) {
      toggleWrap.hidden = false;
      toggleWrap.removeAttribute('hidden');
      toggleWrap.style.setProperty('display', 'flex', 'important');
      if (showAllExamsExpanded) {
        toggleBtn.innerHTML = '<span>Show less</span> <span class="btn-icon">↑</span>';
      } else {
        toggleBtn.innerHTML = \`<span>Show all \${allCards.length} exams</span> <span class="btn-icon">↓</span>\`;
      }
    } else {
      toggleWrap.hidden = true;
      toggleWrap.setAttribute('hidden', '');
      toggleWrap.style.setProperty('display', 'none', 'important');
    }
  }
}

// Subject tabs filtering with guaranteed display styling
document.querySelectorAll('.subject-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelector('.subject-tab.active')?.classList.remove('active');
    tab.classList.add('active');
    const subject = tab.dataset.subject;
    document.querySelectorAll('.subject-card').forEach((card) => {
      const shouldShow = subject === 'all' || card.dataset.subject === subject;
      card.hidden = !shouldShow;
      card.style.setProperty('display', shouldShow ? 'flex' : 'none', 'important');
    });
  });
});

// Run catalog filter initially
window.addEventListener('DOMContentLoaded', applyCatalogFilters);
applyCatalogFilters();

document.querySelectorAll('.subject-test-btn')`;

  js = js.slice(0, startIndex) + newCatalogBlock + js.slice(endIndex + oldCatalogBlockEnd.length);
  console.log('✓ script.js catalog controller and subject filtering updated');
} else {
  console.warn('! could not locate catalog block in script.js (startIndex=' + startIndex + ', endIndex=' + endIndex + ')');
}

if (isJsCRLF) js = js.replace(/\n/g, '\r\n');
fs.writeFileSync('script.js', js, 'utf8');
console.log('✓ script.js saved');
