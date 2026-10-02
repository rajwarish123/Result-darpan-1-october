(() => {
  const nav = document.querySelector('.main-nav');
  if (!nav || nav.querySelector('.more-menu')) return;

  // Remove admin dashboard link if present for public visitors
  nav.querySelectorAll(':scope > a').forEach((link) => {
    if (link.textContent.trim().toLowerCase() === 'admin dashboard') link.remove();
  });

  // Top navigation items that stay permanently on the main bar
  const keepLabels = new Set([
    'home',
    'my profile',
    'about us',
    'test series',
    'chat with mentor',
    'ai study mentor',
    'ai study mentor ✦'
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

  // Client-side address bar cleaner: seamlessly remove .html for clean URL display
  try {
    if (window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html')) {
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
    { label: 'AI Study Mentor 24/7', href: 'mentor-chat', icon: '🤖' },
    { label: 'Contact Us', href: 'contact#contact-form', icon: '📬' }
  ];

  shortcuts.forEach((sc) => {
    const a = document.createElement('a');
    a.href = sc.href;
    a.innerHTML = `<span class="more-icon">${sc.icon}</span><span>${sc.label}</span>`;
    dropdown.appendChild(a);
  });

  // Retain any distinct custom links that may have been in the source markup
  const shortcutKeywords = ['blog', 'contact', 'previous', 'class', 'resource', 'subject', 'exam', 'notification', 'mentor', 'test series', 'profile', 'about'];
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
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = moreMenu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

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

      closeMenu();

      // Close mobile drawer if open
      nav.classList.remove('open');
      const menuToggle = document.querySelector('.menu-toggle');
      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!moreMenu.contains(event.target)) closeMenu();
  });

  // Universal clean-route click resolver:
  // If testing on local static server (file://, port 5500, port 3001, etc.) where server URL rewrites do not exist,
  // ensure clicking clean routes (blogs, contact, resources, notifications, etc.) transparently loads the .html file
  // and nav.js will immediately clean the address bar with history.replaceState!
  const internalCleanRoutes = new Set([
    'blogs',
    'contact',
    'resources',
    'profile',
    'mentor-chat',
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
})();
