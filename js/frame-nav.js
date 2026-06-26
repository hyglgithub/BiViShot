/**
 * BiViShot Frame Navigation Module
 * Navigate between video frames when paused
 */
(function() {
  'use strict';

  window.BiViShot = window.BiViShot || {};

  window.BiViShot.frameNav = (() => {
    function getVideoElement() {
      return window.BiViShot.capture ? window.BiViShot.capture.getVideoElement() : null;
    }

    function isPaused() {
      const video = getVideoElement();
      return video ? video.paused : false;
    }

    async function previousFrame() {
      const video = getVideoElement();
      if (!video || !video.paused) return;

      const frameStep = await window.BiViShot.storage.get('frameStep');
      video.currentTime = Math.max(0, video.currentTime - frameStep);
    }

    async function nextFrame() {
      const video = getVideoElement();
      if (!video || !video.paused) return;

      const frameStep = await window.BiViShot.storage.get('frameStep');
      video.currentTime = Math.min(video.duration, video.currentTime + frameStep);
    }

    return { previousFrame, nextFrame, isPaused };
  })();
})();
