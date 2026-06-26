/**
 * BiViShot Toolbar Module
 * Creates floating draggable toolbar with capture controls
 */
(function() {
  'use strict';

  window.BiViShot = window.BiViShot || {};

  window.BiViShot.toolbar = (() => {
    let toolbarEl = null;
    let videoEl = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // SVG icons
    const ICONS = {
      capture: '<svg viewBox="0 0 24 24"><path d="M12 15.2l3.5-2.1L12 11v4.2zM5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h14V6H5z"/></svg>',
      clipboard: '<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m4-2a2 2 0 00-2 2h4a2 2 0 00-2-2zM8 13h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>',
      prevFrame: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/></svg>',
      nextFrame: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z"/></svg>',
      settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0015.5 12 3.5 3.5 0 0012 8.5 3.5 3.5 0 008.5 12 3.5 3.5 0 0012 15.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/></svg>'
    };

    const TOOLTIPS = {
      capture: '保存截图',
      clipboard: '复制到剪贴板',
      prevFrame: '上一帧 (需暂停)',
      nextFrame: '下一帧 (需暂停)',
      settings: '设置'
    };

    function createButton(id, icon, tooltip, onClick) {
      const btn = document.createElement('button');
      btn.className = 'bivishot-btn';
      btn.dataset.action = id;
      btn.innerHTML = `${icon}<span class="bivishot-tooltip">${tooltip}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!btn.classList.contains('disabled')) {
          onClick();
        }
      });
      return btn;
    }

    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'bivishot-toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }

    function setupDrag() {
      toolbarEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.bivishot-btn')) return;
        isDragging = true;
        const rect = toolbarEl.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        // Use viewport coordinates for fixed positioning
        let x = e.clientX - dragOffset.x;
        let y = e.clientY - dragOffset.y;

        // Clamp to viewport bounds
        const toolbarRect = toolbarEl.getBoundingClientRect();
        x = Math.max(0, Math.min(x, window.innerWidth - toolbarRect.width));
        y = Math.max(0, Math.min(y, window.innerHeight - toolbarRect.height));

        toolbarEl.style.left = `${x}px`;
        toolbarEl.style.top = `${y}px`;
      });

      document.addEventListener('mouseup', async () => {
        if (!isDragging) return;
        isDragging = false;
        await window.BiViShot.storage.set('toolbarPosition', {
          x: parseInt(toolbarEl.style.left),
          y: parseInt(toolbarEl.style.top)
        });
      });
    }

    function updateFrameButtons() {
      if (!toolbarEl) return;
      const paused = window.BiViShot.frameNav.isPaused();
      const prevBtn = toolbarEl.querySelector('[data-action="prevFrame"]');
      const nextBtn = toolbarEl.querySelector('[data-action="nextFrame"]');
      if (prevBtn) prevBtn.classList.toggle('disabled', !paused);
      if (nextBtn) nextBtn.classList.toggle('disabled', !paused);
    }

    async function init(video) {
      if (toolbarEl) destroy();
      videoEl = video;

      // Wait for video metadata
      if (!video.videoWidth) {
        await new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve, { once: true });
        });
      }

      toolbarEl = document.createElement('div');
      toolbarEl.className = 'bivishot-toolbar';

      // Capture to file
      toolbarEl.appendChild(createButton('capture', ICONS.capture, TOOLTIPS.capture, async () => {
        await window.BiViShot.capture.captureToFile();
        showToast('截图已保存');
      }));

      // Capture to clipboard (hide if not supported)
      if (window.BiViShot.capture.isClipboardSupported()) {
        toolbarEl.appendChild(createButton('clipboard', ICONS.clipboard, TOOLTIPS.clipboard, async () => {
          await window.BiViShot.capture.captureToClipboard();
          showToast('已复制到剪贴板');
        }));
      }

      // Previous frame
      toolbarEl.appendChild(createButton('prevFrame', ICONS.prevFrame, TOOLTIPS.prevFrame, () => {
        window.BiViShot.frameNav.previousFrame();
      }));

      // Next frame
      toolbarEl.appendChild(createButton('nextFrame', ICONS.nextFrame, TOOLTIPS.nextFrame, () => {
        window.BiViShot.frameNav.nextFrame();
      }));

      // Settings
      toolbarEl.appendChild(createButton('settings', ICONS.settings, TOOLTIPS.settings, () => {
        window.BiViShot.settings.toggle();
      }));

      // Position toolbar - append to body to avoid overflow clipping
      const position = await window.BiViShot.storage.get('toolbarPosition');
      toolbarEl.style.left = `${position.x}px`;
      toolbarEl.style.top = `${position.y}px`;

      // Append to body instead of video container to avoid overflow:hidden clipping
      document.body.appendChild(toolbarEl);

      setupDrag();

      // Listen for play/pause to update frame buttons
      video.addEventListener('play', updateFrameButtons);
      video.addEventListener('pause', updateFrameButtons);
      updateFrameButtons();
    }

    function destroy() {
      if (toolbarEl) {
        toolbarEl.remove();
        toolbarEl = null;
      }
    }

    return { init, destroy, updateFrameButtons };
  })();
})();
