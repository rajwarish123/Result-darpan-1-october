(() => {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  // If a broken more-menu was left behind, clear it so we rebuild clean
  const existingMore = nav.querySelector('.more-menu');
  if (existingMore) existingMore.remove();

  // Remove admin dashboard link if present for public visitors
  nav.querySelectorAll(':scope > a').forEach((link) => {
    if (link.textContent.trim().toLowerCase() === 'admin dashboard') link.remove();
  });

  // Top navigation items that stay permanently on the main bar
  const keepLabels = new Set([
    'home',
    'my profile',
    'about us',
    'test series'
  ]);

  const isKeep = (link) => {
    const text = link.textContent.replace(/[↗✦⌄]/g, '').trim().toLowerCase();
    if (link.classList.contains('active-page')) return true;
    return keepLabels.has(text);
  };

  const existingLabels = new Set(
    [...nav.querySelectorAll(':scope > a')].map((link) =>
      link.textContent.replace(/[↗✦⌄]/g, '').trim().toLowerCase()
    )
  );

  // Client-side address bar cleaner: seamlessly remove .html for clean URL display on production/clean servers
  try {
    const isStaticEnv = window.location.protocol === 'file:' || 
      ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');
    if (!isStaticEnv && window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html')) {
      const cleanPath = window.location.pathname.replace(/\.html$/, '');
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  } catch (_) {}

  // Guarantee 'About us' link is present on top bar if missing
  if (!existingLabels.has('about us')) {
    const link = document.createElement('a');
    link.href = 'contact';
    link.textContent = 'About us';
    nav.appendChild(link);
  }

  const links = [...nav.querySelectorAll(':scope > a')];
  const movedLinks = links.filter((link) => !isKeep(link));

  // Remove non-kept links from the top bar to keep layout clean
  movedLinks.forEach((link) => link.remove());

  // Build the universal More dropdown containing the full set of 7 shortcuts
  const moreMenu = document.createElement('div');
  moreMenu.className = 'more-menu';
  moreMenu.innerHTML =
    '<button class="more-toggle" type="button" aria-expanded="false">More <span>⌄</span></button><div class="more-dropdown"></div>';
  const dropdown = moreMenu.querySelector('.more-dropdown');

  const heading = document.createElement('div');
  heading.className = 'more-heading';
  heading.textContent = 'Quick Shortcuts';
  dropdown.appendChild(heading);

  const shortcuts = [
    { label: 'Read Strategy Blogs', href: 'blogs', icon: '✍️' },
    { label: 'Free Study Notes & PDFs', href: 'resources', icon: '📚' },
    { label: 'Upcoming Exam Dates', href: 'notifications', icon: '📢' },
    { label: 'Previous Year Questions', href: 'previous-year-questions', icon: '📜' },
    { label: 'School Classes (9-12)', href: 'class-series', icon: '🏫' },
    { label: 'Subject Practice Tests', href: 'index.html#subjects', icon: '🎯' },
    { label: 'Contact Us', href: 'contact#contact-form', icon: '📬' }
  ];

  shortcuts.forEach((sc) => {
    const a = document.createElement('a');
    a.href = sc.href;
    a.innerHTML = `<span class="more-icon">${sc.icon}</span><span>${sc.label}</span>`;
    dropdown.appendChild(a);
  });

  // Retain any distinct custom links that may have been in the source markup
  const shortcutKeywords = ['blog', 'contact', 'previous', 'class', 'resource', 'subject', 'exam', 'notification', 'test series', 'profile', 'about'];
  const extraLinks = movedLinks.filter((link) => {
    const text = link.textContent.trim().toLowerCase();
    return !shortcutKeywords.some((kw) => text.includes(kw));
  });

  if (extraLinks.length) {
    const divider = document.createElement('div');
    divider.className = 'more-divider';
    dropdown.appendChild(divider);
    extraLinks.forEach((link) => {
      const chevron = link.querySelector('.chevron');
      if (chevron) chevron.remove();
      dropdown.appendChild(link);
    });
  }

  nav.appendChild(moreMenu);

  const toggle = moreMenu.querySelector('.more-toggle');
  const closeMenu = () => {
    moreMenu.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  };

  toggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = moreMenu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Mobile drawer toggle controller - Single Source of Truth
  window.toggleNavMenu = function (e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const currentNav = document.querySelector('.main-nav');
    const btn = document.querySelector('.menu-toggle');
    if (!currentNav) return;
    const isOpen = currentNav.classList.toggle('open');
    if (btn) {
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.textContent = isOpen ? '×' : '☰';
    }
  };

  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle && !menuToggle.dataset.bound) {
    menuToggle.dataset.bound = 'true';
    let lastTouchTime = 0;
    menuToggle.addEventListener('touchstart', (e) => {
      lastTouchTime = Date.now();
      window.toggleNavMenu(e);
    }, { passive: false });
    menuToggle.addEventListener('click', (e) => {
      if (Date.now() - lastTouchTime < 450) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      window.toggleNavMenu(e);
    });
  }

  const closeAllNav = () => {
    closeMenu();
    if (nav.classList.contains('open')) {
      nav.classList.remove('open');
      const btn = document.querySelector('.menu-toggle');
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '☰';
      }
    }
  };

  dropdown.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href') || '';
      let [path, hash] = href.split('#');
      const currentPath = window.location.pathname.replace(/^\/+/g, '').split('/').pop() || '';

      if (hash) {
        const isCurrentPage =
          !path ||
          path === '/' ||
          path === currentPath ||
          path.replace(/\.html$/, '') === currentPath.replace(/\.html$/, '') ||
          ((path === 'index.html' || path === '' || path === '/') && (currentPath === '' || currentPath === 'index.html'));

        if (isCurrentPage) {
          const targetEl = document.getElementById(hash);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth' });
            history.pushState(null, '', '#' + hash);
          }
        }
      }

      closeAllNav();
    });
  });

  // Automatically close mobile nav drawer when any link is clicked
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 800) {
        closeAllNav();
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (moreMenu && !moreMenu.contains(event.target)) closeMenu();
    if (nav.classList.contains('open') && !nav.contains(event.target) && !menuToggle?.contains(event.target)) {
      closeAllNav();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllNav();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 800 && nav.classList.contains('open')) {
      closeAllNav();
    }
  });

  // Universal clean-route click resolver:
  const internalCleanRoutes = new Set([
    'blogs',
    'contact',
    'resources',
    'profile',
    'class-series',
    'previous-year-questions',
    'notifications',
    'privacy',
    'terms',
    'wariya'
  ]);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const rawHref = link.getAttribute('href');
    if (!rawHref || rawHref.startsWith('http://') || rawHref.startsWith('https://') || rawHref.startsWith('//') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('#')) return;

    const isLocalStatic = 
      window.location.protocol === 'file:' || 
      ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

    let path = rawHref;
    let queryAndHash = '';
    const qIndex = rawHref.search(/[?#]/);
    if (qIndex !== -1) {
      path = rawHref.slice(0, qIndex);
      queryAndHash = rawHref.slice(qIndex);
    }

    const cleanPath = path.replace(/^\/+/, '');
    const currentFile = window.location.pathname.replace(/^\/+/g, '').split('/').pop() || '';
    const isHomePage = currentFile === '' || currentFile === 'index.html';

    // Smooth scroll to in-page Prep Desk if student clicks 'My profile' on home page
    if (isHomePage && (cleanPath === 'profile' || cleanPath === 'profile.html')) {
      const profileSection = document.getElementById('profile');
      if (profileSection) {
        e.preventDefault();
        profileSection.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', '#profile');
        closeAllNav();
        return;
      }
    }

    if (isLocalStatic) {
      if (cleanPath === '' || cleanPath === 'index') {
        e.preventDefault();
        window.location.href = 'index.html' + queryAndHash;
        return;
      }
      if (internalCleanRoutes.has(cleanPath)) {
        e.preventDefault();
        window.location.href = cleanPath + '.html' + queryAndHash;
        return;
      }
    }
  });

  const LOGIN_BADGE_HTML = `
    <span class="rd-auth-inner">
      <span class="rd-auth-icon-box" aria-hidden="true">
        <svg class="rd-auth-svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M8 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4 12h9" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          <path d="M9 8l4 4-4 4" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="rd-auth-text">LOGIN</span>
    </span>
  `;

  const LOGOUT_BADGE_HTML = `
    <span class="rd-auth-inner">
      <span class="rd-auth-icon-box" aria-hidden="true">
        <svg class="rd-auth-svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h11" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20 12H11" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          <path d="M15 8l-4 4 4 4" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="rd-auth-text">LOGOUT</span>
    </span>
  `;

  // Global Header Profile Button Synchronizer
  function syncHeaderProfileButton() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    let profileBtn = navActions.querySelector('#guestProfileBtn, .nav-cta, .login-btn');
    if (!profileBtn) {
      profileBtn = document.createElement('button');
      profileBtn.id = 'guestProfileBtn';
      navActions.appendChild(profileBtn);
    }

    const isLocalStatic = 
      window.location.protocol === 'file:' || 
      ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

    const token = window.localStorage.getItem('preply-session-token');
    const savedName = window.localStorage.getItem('preply-profile-name');

    if (token && savedName) {
      profileBtn.innerHTML = LOGOUT_BADGE_HTML;
      profileBtn.setAttribute('aria-label', `Logout (${savedName})`);
      profileBtn.setAttribute('title', `Logged in as ${savedName} · Click to log out`);
      profileBtn.className = 'rd-auth-badge-btn nav-cta is-logged-in';
    } else {
      profileBtn.innerHTML = LOGIN_BADGE_HTML;
      profileBtn.setAttribute('aria-label', 'Login');
      profileBtn.setAttribute('title', 'Log in to Result Darpan');
      profileBtn.className = 'rd-auth-badge-btn nav-cta';
    }

    // Attach click handler
    profileBtn.onclick = async (e) => {
      e.preventDefault();
      const hasSession = window.localStorage.getItem('preply-session-token');
      if (hasSession) {
        const userName = window.localStorage.getItem('preply-profile-name') || 'Learner';
        if (window.confirm(`Do you want to log out of ${userName}?`)) {
          const authToken = window.localStorage.getItem('preply-session-token');
          if (authToken) {
            try {
              await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
              });
            } catch (_) {}
          }
          window.localStorage.removeItem('preply-session-token');
          window.localStorage.removeItem('preply-account-email');
          window.localStorage.removeItem('preply-authenticated');
          window.dispatchEvent(new Event('profile-session-changed'));
          window.dispatchEvent(new Event('preply-profile-stats-update'));
          syncHeaderProfileButton();
          if (typeof loadHomeProfile === 'function') loadHomeProfile();
          if (typeof loadAccountProfile === 'function') loadAccountProfile();
        }
      } else {
        if (typeof openAuth === 'function') {
          openAuth();
        } else {
          window.location.href = isLocalStatic ? 'index.html?login=1#auth' : '/?login=1#auth';
        }
      }
    };
  }

  syncHeaderProfileButton();
  window.addEventListener('profile-session-changed', syncHeaderProfileButton);
  window.addEventListener('storage', (e) => {
    if (e.key === 'preply-session-token' || e.key === 'preply-profile-name') {
      syncHeaderProfileButton();
    }
  });

})();
