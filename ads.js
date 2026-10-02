/**
 * Result Darpan Ad Management & Future-Ready Monetization Engine
 * Supports Google AdSense, programmatic ads, and direct sponsor banners.
 */
(() => {
  const DEFAULT_CONFIG = {
    enabled: false,
    adClient: '',
    autoAds: false,
    showTopBanner: true,
    showInFeed: true,
    showArticleBanner: true,
    testMode: false
  };

  let adsbygoogleLoaded = false;

  async function initAds() {
    let config = { ...DEFAULT_CONFIG };

    try {
      const res = await fetch('/api/ad-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.adSettings) {
          config = { ...config, ...data.adSettings };
        }
      }
    } catch (e) {
      console.warn('Ad configuration could not be loaded from API, using defaults.');
    }

    const containers = document.querySelectorAll('.rd-ad-container');
    if (!containers.length) return;

    // If ads are completely disabled and not in test preview mode, hide all slots cleanly
    if (!config.enabled && !config.testMode) {
      containers.forEach((el) => {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      });
      return;
    }

    // Test Mode / Ad Preview Mode (helps owner preview placement before AdSense approval)
    if (config.testMode && !config.enabled) {
      containers.forEach((el) => {
        const slotType = el.dataset.adSlot || 'banner';
        el.style.display = 'block';
        el.removeAttribute('aria-hidden');
        el.innerHTML = `
          <div class="ad-preview-box">
            <span class="ad-label">SPONSORED ADVERTISEMENT (PREVIEW)</span>
            <div class="ad-preview-inner">
              <span class="ad-preview-icon">📢</span>
              <div>
                <strong>Ad Slot Reserved · ${escapeAdText(slotType)}</strong>
                <p>This slot is future-ready for Google AdSense or direct sponsors. Set your Client ID in the Admin Panel to go live.</p>
              </div>
            </div>
          </div>
        `;
      });
      return;
    }

    // Live Google AdSense Mode
    if (config.enabled && config.adClient) {
      loadGoogleAdSenseScript(config.adClient, config.autoAds);

      containers.forEach((el) => {
        const slotType = el.dataset.adSlot || 'topLeaderboard';

        // Check individual slot toggles
        if (slotType === 'topLeaderboard' && !config.showTopBanner) {
          el.style.display = 'none';
          return;
        }
        if (slotType === 'inFeedCatalog' && !config.showInFeed) {
          el.style.display = 'none';
          return;
        }
        if (slotType === 'articleInline' && !config.showArticleBanner) {
          el.style.display = 'none';
          return;
        }

        el.style.display = 'block';
        el.removeAttribute('aria-hidden');

        // Only inject if not already injected
        if (el.querySelector('.adsbygoogle')) return;

        const slotId = el.dataset.adSlotId || '';
        el.innerHTML = `
          <span class="ad-label">ADVERTISEMENT</span>
          <ins class="adsbygoogle"
               style="display:block; text-align:center;"
               data-ad-client="${escapeAdText(config.adClient)}"
               ${slotId ? `data-ad-slot="${escapeAdText(slotId)}"` : ''}
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        `;

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
          console.warn('AdSense slot init error:', err.message);
        }
      });
    }
  }

  function loadGoogleAdSenseScript(adClient, autoAds) {
    if (adsbygoogleLoaded || document.getElementById('adsense-script')) return;
    adsbygoogleLoaded = true;

    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adClient)}`;
    document.head.appendChild(script);
  }

  function escapeAdText(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAds);
  } else {
    initAds();
  }
})();
