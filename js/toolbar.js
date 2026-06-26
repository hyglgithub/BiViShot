/**
 * BiViShot Toolbar Module
 * Creates floating draggable toolbar with capture controls
 */
(function() {
  'use strict';

  window.BiViShot = window.BiViShot || {};

  window.BiViShot.toolbar = (() => {
    let boxEl = null;      // Outer container
    let toolbarEl = null;  // Toolbar bar
    let panelEl = null;    // Settings panel
    let videoEl = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let longPressTimer = null;
    let longPressInterval = null;
    let abortController = null;  // For cleaning up event listeners

    // SVG icons (Feather style)
    const ICONS = {
      capture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
      prevFrame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>',
      nextFrame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      dragHandle: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>'
    };

    const TOOLTIPS = {
      capture: '保存截图',
      clipboard: '复制到剪贴板',
      prevFrame: '上一帧 (需暂停)',
      nextFrame: '下一帧 (需暂停)',
      settings: '设置'
    };

    // Create button without click handler (for long press buttons)
    function createButtonNoClick(id, icon, tooltip) {
      const btn = document.createElement('button');
      btn.className = 'bivishot-btn';
      btn.dataset.action = id;
      btn.innerHTML = `${icon}<span class="bivishot-tooltip">${tooltip}</span>`;
      return btn;
    }

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
      const dragHandle = boxEl.querySelector('.bivishot-drag-handle');
      if (!dragHandle) return;

      const signal = abortController.signal;

      dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = boxEl.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let x = e.clientX - dragOffset.x;
        let y = e.clientY - dragOffset.y;

        // Clamp to viewport bounds
        const boxRect = boxEl.getBoundingClientRect();
        x = Math.max(0, Math.min(x, window.innerWidth - boxRect.width));
        y = Math.max(0, Math.min(y, window.innerHeight - boxRect.height));

        boxEl.style.left = `${x}px`;
        boxEl.style.top = `${y}px`;
      }, { signal });

      document.addEventListener('mouseup', async () => {
        if (!isDragging) return;
        isDragging = false;
        await window.BiViShot.storage.set('toolbarPosition', {
          x: parseInt(boxEl.style.left),
          y: parseInt(boxEl.style.top)
        });
      }, { signal });
    }

    function setupLongPress(btn, action) {
      const startLongPress = (e) => {
        e.preventDefault();
        action(); // Execute immediately
        longPressTimer = setTimeout(() => {
          longPressInterval = setInterval(action, 100); // Repeat every 100ms
        }, 500); // Start repeating after 500ms
      };

      const stopLongPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (longPressInterval) {
          clearInterval(longPressInterval);
          longPressInterval = null;
        }
      };

      btn.addEventListener('mousedown', startLongPress);
      btn.addEventListener('mouseup', stopLongPress);
      btn.addEventListener('mouseleave', stopLongPress);
    }

    function updateFrameButtons() {
      if (!toolbarEl) return;
      const paused = window.BiViShot.frameNav.isPaused();
      const prevBtn = toolbarEl.querySelector('[data-action="prevFrame"]');
      const nextBtn = toolbarEl.querySelector('[data-action="nextFrame"]');
      if (prevBtn) prevBtn.classList.toggle('disabled', !paused);
      if (nextBtn) nextBtn.classList.toggle('disabled', !paused);
    }

    function createSettingsPanel() {
      const panel = document.createElement('div');
      panel.className = 'bivishot-panel';
      panel.innerHTML = `
        <div class="bivishot-settings-group">
          <div class="bivishot-settings-label">截图格式</div>
          <div class="bivishot-settings-radios">
            <label><input type="radio" name="bvs-format" value="png"> PNG</label>
            <label><input type="radio" name="bvs-format" value="jpeg"> JPEG</label>
          </div>
        </div>
        <div class="bivishot-settings-group" id="bvs-quality-group">
          <div class="bivishot-settings-label">JPEG 质量</div>
          <div class="bivishot-settings-slider">
            <input type="range" id="bvs-quality" min="1" max="100" value="95">
            <span id="bvs-quality-value">95%</span>
          </div>
        </div>
        <div class="bivishot-settings-group">
          <div class="bivishot-settings-label">帧步长</div>
          <div class="bivishot-settings-radios">
            <label><input type="radio" name="bvs-step" value="1"> 1/1</label>
            <label><input type="radio" name="bvs-step" value="0.2"> 1/5</label>
            <label><input type="radio" name="bvs-step" value="0.066667"> 1/15</label>
            <label><input type="radio" name="bvs-step" value="0.033333"> 1/30</label>
          </div>
        </div>
        <button class="bivishot-settings-reset" id="bvs-reset-defaults">恢复默认设置</button>
      `;
      return panel;
    }

    async function loadSettingsValues() {
      if (!panelEl) return;

      const format = await window.BiViShot.storage.get('imageFormat');
      const quality = await window.BiViShot.storage.get('jpegQuality');
      const step = await window.BiViShot.storage.get('frameStep');

      const formatRadio = panelEl.querySelector(`input[name="bvs-format"][value="${format}"]`);
      if (formatRadio) formatRadio.checked = true;

      const qualityInput = panelEl.querySelector('#bvs-quality');
      const qualityValue = panelEl.querySelector('#bvs-quality-value');
      if (qualityInput) qualityInput.value = quality;
      if (qualityValue) qualityValue.textContent = `${quality}%`;

      const qualityGroup = panelEl.querySelector('#bvs-quality-group');
      if (qualityGroup) qualityGroup.style.display = format === 'jpeg' ? 'block' : 'none';

      // Find closest step value
      const stepRadios = panelEl.querySelectorAll('input[name="bvs-step"]');
      let closestStep = null;
      let closestDiff = Infinity;
      stepRadios.forEach((radio) => {
        const diff = Math.abs(parseFloat(radio.value) - step);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestStep = radio;
        }
      });
      if (closestStep) closestStep.checked = true;
    }

    function setupSettingsListeners() {
      if (!panelEl) return;

      panelEl.querySelectorAll('input[name="bvs-format"]').forEach((radio) => {
        radio.addEventListener('change', async (e) => {
          await window.BiViShot.storage.set('imageFormat', e.target.value);
          const qualityGroup = panelEl.querySelector('#bvs-quality-group');
          if (qualityGroup) qualityGroup.style.display = e.target.value === 'jpeg' ? 'block' : 'none';
        });
      });

      const qualityInput = panelEl.querySelector('#bvs-quality');
      const qualityValue = panelEl.querySelector('#bvs-quality-value');
      if (qualityInput) {
        qualityInput.addEventListener('input', async (e) => {
          const val = parseInt(e.target.value);
          if (qualityValue) qualityValue.textContent = `${val}%`;
          await window.BiViShot.storage.set('jpegQuality', val);
        });
      }

      panelEl.querySelectorAll('input[name="bvs-step"]').forEach((radio) => {
        radio.addEventListener('change', async (e) => {
          await window.BiViShot.storage.set('frameStep', parseFloat(e.target.value));
        });
      });

      const resetBtn = panelEl.querySelector('#bvs-reset-defaults');
      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          const DEFAULTS = window.BiViShot.storage.DEFAULTS;
          await window.BiViShot.storage.set('imageFormat', DEFAULTS.imageFormat);
          await window.BiViShot.storage.set('jpegQuality', DEFAULTS.jpegQuality);
          await window.BiViShot.storage.set('frameStep', DEFAULTS.frameStep);
          await window.BiViShot.storage.set('toolbarPosition', DEFAULTS.toolbarPosition);
          loadSettingsValues();
          showToast('已恢复默认设置');
        });
      }
    }

    function toggleSettings() {
      if (panelEl) {
        // Close settings
        panelEl.remove();
        panelEl = null;
      } else {
        // Open settings
        panelEl = createSettingsPanel();
        boxEl.appendChild(panelEl);
        loadSettingsValues();
        setupSettingsListeners();
      }
    }

    async function init(video) {
      if (boxEl) destroy();
      videoEl = video;

      // Create new AbortController for this session
      abortController = new AbortController();

      // Wait for video metadata
      if (!video.videoWidth) {
        await new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve, { once: true });
        });
      }

      // Create outer container (like .box in the example)
      boxEl = document.createElement('div');
      boxEl.className = 'bivishot-box';

      // Create toolbar (like .bar in the example)
      toolbarEl = document.createElement('div');
      toolbarEl.className = 'bivishot-bar';

      // Drag handle
      const dragHandle = document.createElement('div');
      dragHandle.className = 'bivishot-drag-handle';
      dragHandle.innerHTML = ICONS.dragHandle;
      dragHandle.title = '拖动';
      toolbarEl.appendChild(dragHandle);

      // Capture to file
      toolbarEl.appendChild(createButton('capture', ICONS.capture, TOOLTIPS.capture, async () => {
        await window.BiViShot.capture.captureToFile();
        showToast('截图已保存');
      }));

      // Capture to clipboard
      if (window.BiViShot.capture.isClipboardSupported()) {
        toolbarEl.appendChild(createButton('clipboard', ICONS.clipboard, TOOLTIPS.clipboard, async () => {
          await window.BiViShot.capture.captureToClipboard();
          showToast('已复制到剪贴板');
        }));
      }

      // Previous frame - use createButtonNoClick to avoid double-trigger
      const prevBtn = createButtonNoClick('prevFrame', ICONS.prevFrame, TOOLTIPS.prevFrame);
      setupLongPress(prevBtn, () => window.BiViShot.frameNav.previousFrame());
      toolbarEl.appendChild(prevBtn);

      // Next frame - use createButtonNoClick to avoid double-trigger
      const nextBtn = createButtonNoClick('nextFrame', ICONS.nextFrame, TOOLTIPS.nextFrame);
      setupLongPress(nextBtn, () => window.BiViShot.frameNav.nextFrame());
      toolbarEl.appendChild(nextBtn);

      // Settings button
      toolbarEl.appendChild(createButton('settings', ICONS.settings, TOOLTIPS.settings, () => {
        toggleSettings();
      }));

      boxEl.appendChild(toolbarEl);

      // Position
      const position = await window.BiViShot.storage.get('toolbarPosition');
      boxEl.style.left = `${position.x}px`;
      boxEl.style.top = `${position.y}px`;

      // Append to body
      document.body.appendChild(boxEl);

      setupDrag();

      // Listen for play/pause
      video.addEventListener('play', updateFrameButtons);
      video.addEventListener('pause', updateFrameButtons);
      updateFrameButtons();
    }

    function destroy() {
      // Abort all event listeners
      if (abortController) {
        abortController.abort();
        abortController = null;
      }

      // Clean up long press timers
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (longPressInterval) {
        clearInterval(longPressInterval);
        longPressInterval = null;
      }

      if (boxEl) {
        boxEl.remove();
        boxEl = null;
        toolbarEl = null;
        panelEl = null;
      }
    }

    return { init, destroy, updateFrameButtons };
  })();
})();
