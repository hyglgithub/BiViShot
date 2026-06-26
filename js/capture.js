/**
 * BiViShot Capture Module
 * Captures video frames using OffscreenCanvas
 */
(function() {
  'use strict';

  window.BiViShot = window.BiViShot || {};

  window.BiViShot.capture = (() => {
    const VIDEO_SELECTORS = [
      '.bpx-player-video-wrap video',
      '#bilibili-player video',
      'video'
    ];

    function getVideoElement() {
      for (const selector of VIDEO_SELECTORS) {
        const video = document.querySelector(selector);
        if (video) return video;
      }
      return null;
    }

    function isClipboardSupported() {
      return navigator.clipboard && typeof ClipboardItem !== 'undefined';
    }

    function generateFilename(format) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      return `bivishot-${date}-${time}.${format}`;
    }

    async function captureFrame(video, format, quality) {
      const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blobOptions = format === 'jpeg' ? { type: mimeType, quality: quality / 100 } : { type: mimeType };
      return canvas.convertToBlob(blobOptions);
    }

    async function captureToFile() {
      const video = getVideoElement();
      if (!video) {
        console.warn('[BiViShot] Video element not found');
        return;
      }

      const format = await window.BiViShot.storage.get('imageFormat');
      const quality = await window.BiViShot.storage.get('jpegQuality');

      try {
        const blob = await captureFrame(video, format, quality);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateFilename(format);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('[BiViShot] Capture failed:', err);
      }
    }

    async function captureToClipboard() {
      const video = getVideoElement();
      if (!video) {
        console.warn('[BiViShot] Video element not found');
        return;
      }

      try {
        // Always use PNG for clipboard - ClipboardItem doesn't reliably support JPEG
        const blob = await captureFrame(video, 'png', 100);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      } catch (err) {
        console.error('[BiViShot] Clipboard write failed:', err);
      }
    }

    return {
      captureToFile,
      captureToClipboard,
      getVideoElement,
      isClipboardSupported
    };
  })();
})();
