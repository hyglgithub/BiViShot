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

  function waitForVideo() {
    return new Promise((resolve) => {
      const video = findVideo();
      if (video) {
        resolve(video);
        return;
      }
      const observer = new MutationObserver(() => {
        const video = findVideo();
        if (video) {
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
        console.warn('[BiViShot] No video element found');
        return;
      }
      await BiViShot.toolbar.init(video);
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
      BiViShot.toolbar.destroy();
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
