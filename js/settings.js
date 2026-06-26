/**
 * BiViShot Settings Module (Inline)
 * Shows settings panel directly on the page
 */
(function() {
  'use strict';

  window.BiViShot = window.BiViShot || {};

  window.BiViShot.settings = (() => {
    let panelEl = null;

    function createPanel() {
      const panel = document.createElement('div');
      panel.className = 'bivishot-settings-panel';
      panel.innerHTML = `
        <div class="bivishot-settings-header">BiViShot 设置</div>
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
            <label><input type="radio" name="bvs-step" value="0.041667"> 1/24</label>
            <label><input type="radio" name="bvs-step" value="0.033333"> 1/30</label>
            <label><input type="radio" name="bvs-step" value="0.016667"> 1/60</label>
          </div>
        </div>
        <button class="bivishot-settings-reset" id="bvs-reset-pos">重置工具条位置</button>
      `;

      // Style the panel - use fixed positioning to avoid overflow clipping
      Object.assign(panel.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: '999999',
        minWidth: '220px',
        color: '#fff',
        fontSize: '13px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      });

      return panel;
    }

    async function loadValues() {
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

      const stepRadio = panelEl.querySelector(`input[name="bvs-step"][value="${step}"]`);
      if (stepRadio) stepRadio.checked = true;
    }

    function setupListeners() {
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

      const resetBtn = panelEl.querySelector('#bvs-reset-pos');
      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          await window.BiViShot.storage.set('toolbarPosition', { x: 100, y: 100 });
        });
      }

      // Close on click outside
      document.addEventListener('click', (e) => {
        if (panelEl && !panelEl.contains(e.target) && !e.target.closest('[data-action="settings"]')) {
          hide();
        }
      });
    }

    function show() {
      if (panelEl) {
        hide();
        return;
      }
      panelEl = createPanel();
      // Append to body to avoid overflow clipping
      document.body.appendChild(panelEl);
      loadValues();
      setupListeners();
    }

    function hide() {
      if (panelEl) {
        panelEl.remove();
        panelEl = null;
      }
    }

    function toggle() {
      if (panelEl) {
        hide();
      } else {
        show();
      }
    }

    return { toggle, show, hide };
  })();
})();
