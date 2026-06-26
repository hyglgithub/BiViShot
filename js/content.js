/**
 * BiViShot Content Script
 * Entry point - initializes all modules on B站 video pages
 */

(async function() {
  'use strict';

  const VIDEO_SELECTORS = [
    '.bpx-player-video-wrap video',
    '#bilibili-player video',
    'video'
  ];

  function findVideo() {
    for (const selector of VIDEO_SELECTORS) {
      const video = document.querySelector(selector);
      if (video) return video;
    }
    return null;
  }

  function waitForVideo(timeout = 30000) {
    return new Promise((resolve) => {
      const video = findVideo();
      if (video) {
        resolve(video);
        return;
      }

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(null);  // Timeout - no video found
        }
      }, timeout);

      const observer = new MutationObserver(() => {
        const video = findVideo();
        if (video && !resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(video);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  async function init() {
    try {
      const video = await waitForVideo();
      if (!video) {
        console.warn('[BiViShot] No video element found (timeout)');
        return;
      }
      await window.BiViShot.toolbar.init(video);
      console.log('[BiViShot] Initialized successfully');
    } catch (err) {
      console.error('[BiViShot] Initialization failed:', err);
    }
  }

  // B站 is a SPA - watch for URL changes
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      window.BiViShot.toolbar.destroy();
      init();
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
