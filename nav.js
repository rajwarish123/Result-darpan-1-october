(() => {
  const nav = document.querySelector('.main-nav');
  if (!nav || nav.querySelector('.more-menu')) return;

  // Remove admin dashboard link if present for public visitors
  nav.querySelectorAll(':scope > a').forEach((link) => {
    if (link.textContent.trim().toLowerCase() === 'admin dashboard') link.remove();
  });

  // Top navigation items that stay permanently on the main bar
  const keepLabels = new Set([
    'my profile',
    'about us',
    'test series',
    'chat with mentor',
    'ai study mentor',
    'ai study mentor ✦'
  ]);

  const existingLabels = new Set(
    [...nav.querySelectorAll(':scope > a')].map((link) =>
      link.textContent.replace(/[↗✦⌄]/g, '').trim().toLowerCase()
    )
  );

  // Guarantee 'About us' link is present on top bar if missing
  if (!existingLabels.has('about us')) {
    const link = document.createElement('a');
    link.href = 'contact.html';
    link.textContent = 'About us';
    nav.appendChild(link);
  }

  const links = [...nav.querySelectorAll(':scope > a')];
  const movedLinks = links.filter(
    (link) => !keepLabels.has(link.textContent.replace(/[↗✦⌄]/g, '').trim().toLowerCase())
  );

  const moreMenu = document.createElement('div');
  moreMenu.className = 'more-menu';
  moreMenu.innerHTML =
    '<button class="more-toggle" type="button" aria-expanded="false">More <span>⌄</span></button><div class="more-dropdown"></div>';
  const dropdown = moreMenu.querySelector('.more-dropdown');

  movedLinks.forEach((link) => {
    // Strip redundant chevron indicators from dropdown links
    const chevron = link.querySelector('.chevron');
    if (chevron) chevron.remove();
    dropdown.appendChild(link);
  });

  // Shortcut 1: Read Blogs -> links to index.html#strategy-blogs
  const hasBlogsShortcut = [...dropdown.querySelectorAll('a')].some((a) =>
    a.textContent.toLowerCase().includes('blog')
  );
  if (!hasBlogsShortcut) {
    const blogLink = document.createElement('a');
    blogLink.href = 'index.html#strategy-blogs';
    blogLink.textContent = 'Read Blogs';
    dropdown.appendChild(blogLink);
  }

  // Shortcut 2: Contact Us -> links to contact.html#contact-form
  const hasContactShortcut = [...dropdown.querySelectorAll('a')].some((a) =>
    a.textContent.toLowerCase().includes('contact')
  );
  if (!hasContactShortcut) {
    const contactLink = document.createElement('a');
    contactLink.href = 'contact.html#contact-form';
    contactLink.textContent = 'Contact Us';
    dropdown.appendChild(contactLink);
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

      // Smooth scroll if clicking Read Blogs while already on index page
      if (href.includes('#strategy-blogs')) {
        const blogEl = document.getElementById('strategy-blogs');
        if (blogEl) {
          e.preventDefault();
          blogEl.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', '#strategy-blogs');
        }
      } else if (href.includes('#contact-form')) {
        // Smooth scroll if clicking Contact Us while already on contact page
        const contactEl = document.getElementById('contact-form') || document.getElementById('contactForm');
        if (contactEl) {
          e.preventDefault();
          contactEl.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', '#contact-form');
        }
      }

      closeMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!moreMenu.contains(event.target)) closeMenu();
  });
})();
