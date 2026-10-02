const fs = require('fs');
const path = require('path');

const exams = [
  // 6 Most Popular Exams (Shown initially)
  {
    id: 'ssc-cgl',
    category: 'ssc',
    tagClass: 'tag-ssc',
    tagText: 'SSC',
    pill: 'Tier-I · Free',
    logo: 'images/logos/ssc.png',
    title: 'SSC CGL Tier-I Mock 01',
    questions: 100,
    minutes: 60,
    attempts: '14,210 attempts',
    popular: true
  },
  {
    id: 'sbi-clerk',
    category: 'banking',
    tagClass: 'tag-banking',
    tagText: 'BANKING',
    pill: 'Prelims · Free',
    logo: 'images/logos/sbi.svg',
    title: 'SBI Clerk Prelims 2026',
    questions: 100,
    minutes: 60,
    attempts: '12,840 attempts',
    popular: true
  },
  {
    id: 'rrb-ntpc',
    category: 'railways',
    tagClass: 'tag-railways',
    tagText: 'RAILWAYS',
    pill: 'CBT-I · Free',
    logo: 'images/logos/railways.png',
    title: 'RRB NTPC CBT-I Mock 01',
    questions: 100,
    minutes: 90,
    attempts: '18,920 attempts',
    popular: true
  },
  {
    id: 'jee-main',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'NTA · Free',
    logo: 'images/logos/college.svg',
    title: 'JEE Main 2026 · Full Mock Test',
    questions: 90,
    minutes: 180,
    attempts: '21,340 attempts',
    popular: true
  },
  {
    id: 'neet-ug',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'Medical · Free',
    logo: 'images/logos/aiims.png',
    title: 'NEET UG 2026 · Full Practice Paper',
    questions: 180,
    minutes: 200,
    attempts: '24,180 attempts',
    popular: true
  },
  {
    id: 'upsc-prelims',
    category: 'civil',
    tagClass: 'tag-civil',
    tagText: 'CIVIL SERVICES',
    pill: 'CSE · Free',
    logo: 'images/logos/upsc.png',
    title: 'UPSC Civil Services Prelims · GS Paper I',
    questions: 100,
    minutes: 120,
    attempts: '16,750 attempts',
    popular: true
  },

  // College & Entrance Exams
  {
    id: 'jee-advanced',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'IIT · Free',
    logo: 'images/logos/college.svg',
    title: 'JEE Advanced 2026 · Paper 1 Mock',
    questions: 54,
    minutes: 180,
    attempts: '6,410 attempts',
    popular: false
  },
  {
    id: 'cuet-ug',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'NTA · Free',
    logo: 'images/logos/college.svg',
    title: 'CUET UG 2026 · General Test Mock',
    questions: 60,
    minutes: 60,
    attempts: '8,920 attempts',
    popular: false
  },
  {
    id: 'gate-cs',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'IIT/IISc · Free',
    logo: 'images/logos/college.svg',
    title: 'GATE 2026 · Computer Science & IT',
    questions: 65,
    minutes: 180,
    attempts: '5,210 attempts',
    popular: false
  },
  {
    id: 'cat-exam',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'IIM · Free',
    logo: 'images/logos/college.svg',
    title: 'CAT 2026 · Speed & Accuracy Drill',
    questions: 66,
    minutes: 120,
    attempts: '7,340 attempts',
    popular: false
  },
  {
    id: 'clat-exam',
    category: 'college',
    tagClass: 'tag-college',
    tagText: 'COLLEGE',
    pill: 'NLUs · Free',
    logo: 'images/logos/college.svg',
    title: 'CLAT 2026 · Legal & Logical Reasoning',
    questions: 120,
    minutes: 120,
    attempts: '4,670 attempts',
    popular: false
  },

  // Banking Exams
  {
    id: 'sbi-po',
    category: 'banking',
    tagClass: 'tag-banking',
    tagText: 'BANKING',
    pill: 'PO · Free',
    logo: 'images/logos/sbi.svg',
    title: 'SBI PO Prelims 2026 · Mock Test',
    questions: 100,
    minutes: 60,
    attempts: '9,450 attempts',
    popular: false
  },
  {
    id: 'ibps-po',
    category: 'banking',
    tagClass: 'tag-banking',
    tagText: 'BANKING',
    pill: 'IBPS · Free',
    logo: 'images/logos/sbi.svg',
    title: 'IBPS PO Prelims 2026 · Mock Test',
    questions: 100,
    minutes: 60,
    attempts: '8,210 attempts',
    popular: false
  },
  {
    id: 'ibps-clerk',
    category: 'banking',
    tagClass: 'tag-banking',
    tagText: 'BANKING',
    pill: 'IBPS · Free',
    logo: 'images/logos/sbi.svg',
    title: 'IBPS Clerk Prelims 2026 · Mock Test',
    questions: 100,
    minutes: 60,
    attempts: '7,630 attempts',
    popular: false
  },
  {
    id: 'rbi-grade-b',
    category: 'banking',
    tagClass: 'tag-banking',
    tagText: 'BANKING',
    pill: 'RBI · Free',
    logo: 'images/logos/sbi.svg',
    title: 'RBI Grade B Phase-I · Mock 2026',
    questions: 200,
    minutes: 120,
    attempts: '5,120 attempts',
    popular: false
  },

  // SSC Exams
  {
    id: 'ssc-chsl',
    category: 'ssc',
    tagClass: 'tag-ssc',
    tagText: 'SSC',
    pill: '10+2 · Free',
    logo: 'images/logos/ssc.png',
    title: 'SSC CHSL (10+2) Tier-I Mock 2026',
    questions: 100,
    minutes: 60,
    attempts: '9,820 attempts',
    popular: false
  },
  {
    id: 'ssc-mts',
    category: 'ssc',
    tagClass: 'tag-ssc',
    tagText: 'SSC',
    pill: 'CBT · Free',
    logo: 'images/logos/ssc.png',
    title: 'SSC MTS & Havaldar Mock 2026',
    questions: 90,
    minutes: 90,
    attempts: '8,760 attempts',
    popular: false
  },
  {
    id: 'ssc-gd',
    category: 'ssc',
    tagClass: 'tag-ssc',
    tagText: 'SSC',
    pill: 'Constable · Free',
    logo: 'images/logos/ssc.png',
    title: 'SSC GD Constable Practice Set 2026',
    questions: 80,
    minutes: 60,
    attempts: '10,430 attempts',
    popular: false
  },

  // Railways Exams
  {
    id: 'rrb-group-d',
    category: 'railways',
    tagClass: 'tag-railways',
    tagText: 'RAILWAYS',
    pill: 'CBT · Free',
    logo: 'images/logos/railways.png',
    title: 'RRB Group D CBT Mock 2026',
    questions: 100,
    minutes: 90,
    attempts: '13,540 attempts',
    popular: false
  },
  {
    id: 'rrb-alp',
    category: 'railways',
    tagClass: 'tag-railways',
    tagText: 'RAILWAYS',
    pill: 'Loco Pilot · Free',
    logo: 'images/logos/railways.png',
    title: 'RRB ALP CBT-I Practice Test',
    questions: 75,
    minutes: 60,
    attempts: '8,210 attempts',
    popular: false
  },

  // Civil Services & State PCS
  {
    id: 'bpsc-prelims',
    category: 'civil',
    tagClass: 'tag-civil',
    tagText: 'CIVIL SERVICES',
    pill: 'BPSC · Free',
    logo: 'images/logos/upsc.png',
    title: '70th BPSC Prelims · Full Mock Test',
    questions: 150,
    minutes: 120,
    attempts: '7,120 attempts',
    popular: false
  },
  {
    id: 'uppsc-prelims',
    category: 'civil',
    tagClass: 'tag-civil',
    tagText: 'CIVIL SERVICES',
    pill: 'UPPSC · Free',
    logo: 'images/logos/upsc.png',
    title: 'UPPSC PCS Prelims · GS Paper I',
    questions: 150,
    minutes: 120,
    attempts: '6,490 attempts',
    popular: false
  },

  // Defence Exams
  {
    id: 'nda-mathematics',
    category: 'defence',
    tagClass: 'tag-defence',
    tagText: 'DEFENCE',
    pill: 'Paper-I · Free',
    logo: 'images/logos/nda.svg',
    title: 'NDA II 2026 · Mathematics',
    questions: 120,
    minutes: 150,
    attempts: '5,820 attempts',
    popular: false
  },
  {
    id: 'cds-exam',
    category: 'defence',
    tagClass: 'tag-defence',
    tagText: 'DEFENCE',
    pill: 'CDS · Free',
    logo: 'images/logos/nda.svg',
    title: 'UPSC CDS II 2026 · English & GK Mock',
    questions: 120,
    minutes: 120,
    attempts: '5,940 attempts',
    popular: false
  },
  {
    id: 'afcat-exam',
    category: 'defence',
    tagClass: 'tag-defence',
    tagText: 'DEFENCE',
    pill: 'Air Force · Free',
    logo: 'images/logos/nda.svg',
    title: 'AFCAT 01/2026 · Full Practice Test',
    questions: 100,
    minutes: 120,
    attempts: '4,520 attempts',
    popular: false
  },

  // Teaching Exams
  {
    id: 'ctet-paper-1',
    category: 'teaching',
    tagClass: 'tag-teaching',
    tagText: 'TEACHING',
    pill: 'Paper-I · Free',
    logo: 'images/logos/ctet.png',
    title: 'CTET Paper-I Mock 2026',
    questions: 150,
    minutes: 150,
    attempts: '8,190 attempts',
    popular: false
  },
  {
    id: 'ctet-paper-2',
    category: 'teaching',
    tagClass: 'tag-teaching',
    tagText: 'TEACHING',
    pill: 'Paper-II · Free',
    logo: 'images/logos/ctet.png',
    title: 'CTET Paper-II (Class 6-8) Mock 2026',
    questions: 150,
    minutes: 150,
    attempts: '6,840 attempts',
    popular: false
  },
  {
    id: 'ugc-net',
    category: 'teaching',
    tagClass: 'tag-teaching',
    tagText: 'TEACHING',
    pill: 'NTA · Free',
    logo: 'images/logos/ctet.png',
    title: 'UGC NET Paper 1 · Teaching & Research Mock',
    questions: 50,
    minutes: 60,
    attempts: '5,780 attempts',
    popular: false
  }
];

function generateCardHtml(exam) {
  return `          <article class="test-card" data-category="${exam.category}" data-popular="${exam.popular ? 'true' : 'false'}" data-exam-id="${exam.id}">
            <div class="test-card-top" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:12px;">
              <div class="test-logo-badge" style="width:48px; height:48px; min-width:48px; max-width:48px; border-radius:12px; background:#ffffff; border:1px solid #e2e8e4; display:flex; align-items:center; justify-content:center; padding:5px; box-sizing:border-box; overflow:hidden; flex-shrink:0;">
                <img class="test-logo-img" src="${exam.logo}" alt="${exam.title} Logo" width="34" height="34" style="width:34px; height:34px; max-width:34px; max-height:34px; object-fit:contain; display:block;">
              </div>
              <div class="test-badges-group" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <span class="test-tag ${exam.tagClass}">${exam.tagText}</span>
                <span class="test-pill">${exam.pill}</span>
              </div>
            </div>
            <div class="test-content">
              <h3>${exam.title}</h3>
              <div class="test-meta">
                <span>📝 ${exam.questions} questions</span>
                <span>⏱ ${exam.minutes} mins</span>
              </div>
            </div>
            <div class="test-bottom">
              <span class="attempts">● ${exam.attempts}</span>
              <button class="outline-btn start-test" data-mock-test="${exam.id}">Take test <span>→</span></button>
            </div>
          </article>`;
}

const sectionHtml = `    <section class="section catalog" id="popular">
      <div class="shell">
        <div class="section-heading catalog-heading">
          <div>
            <span class="kicker">FIND YOUR EDGE</span>
            <h2>What are you preparing for?</h2>
          </div>
          <div class="slider-controls">
            <button class="slider-btn prev" aria-label="Previous">←</button>
            <button class="slider-btn next" aria-label="Next">→</button>
          </div>
        </div>

        <!-- SEARCH BAR -->
        <div class="catalog-search-wrap">
          <div class="catalog-search-box">
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input type="text" id="catalogSearchInput" class="catalog-search-input" placeholder="Search any exam (e.g. JEE, NEET, SSC CGL, RRB NTPC, SBI PO, UPSC, CTET)..." autocomplete="off" spellcheck="false" aria-label="Search exams">
            <button type="button" id="catalogSearchClear" class="catalog-search-clear" aria-label="Clear search" hidden>×</button>
          </div>
        </div>

        <!-- CATEGORY TABS -->
        <div class="category-row" role="tablist">
          <button class="category active" data-filter="all">All exams</button>
          <button class="category" data-filter="college">College / Entrance</button>
          <button class="category" data-filter="banking">Banking</button>
          <button class="category" data-filter="ssc">SSC</button>
          <button class="category" data-filter="railways">Railways</button>
          <button class="category" data-filter="civil">Civil Services</button>
          <button class="category" data-filter="defence">Defence</button>
          <button class="category" data-filter="teaching">Teaching</button>
        </div>

        <!-- TEST GRID -->
        <div class="test-grid" id="testGrid">
${exams.map(generateCardHtml).join('\n')}
        </div>

        <!-- EMPTY STATE -->
        <div class="catalog-empty-state" id="catalogEmptyState" hidden>
          <div class="empty-icon">🔍</div>
          <h3>No exams found matching "<span id="emptyQueryText"></span>"</h3>
          <p>Try searching with another keyword or explore the categories above.</p>
          <button type="button" class="outline-btn" id="resetSearchBtn">Clear search &amp; view all</button>
        </div>

        <!-- TOGGLE ALL EXAMS (Default shows 6 most popular, toggles all 28) -->
        <div class="view-all-exams-wrap" id="viewAllExamsWrap">
          <button class="view-all-exams-btn" id="toggleAllExamsBtn" type="button">
            <span>Show all 28 exams</span>
            <span class="btn-icon">↓</span>
          </button>
        </div>
      </div>
    </section>`;

const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace the <section class="section catalog" id="popular">...</section>
const startMarker = '<section class="section catalog" id="popular">';
const endMarker = '</section>';

const startIndex = indexContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Could not find startMarker in index.html');
  process.exit(1);
}

// Find matching </section> after startIndex
const endIndex = indexContent.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error('Could not find endMarker in index.html');
  process.exit(1);
}

const updatedContent = indexContent.slice(0, startIndex) + sectionHtml + indexContent.slice(endIndex + endMarker.length);
fs.writeFileSync(indexPath, updatedContent, 'utf8');
console.log('Successfully updated index.html with all 28 exams and clean search bar!');
