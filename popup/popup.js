/**
 * BiViShot Settings Popup
 * Manages user preferences
 */
(async function() {
  'use strict';

  // Default values (same as storage.js DEFAULTS)
  const DEFAULTS = {
    imageFormat: 'png',
    jpegQuality: 95,
    frameStep: 0.2,  // 1/5 second
    toolbarPosition: { x: 100, y: 100 }
  };

  async function getSetting(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[BiViShot] Storage error:', chrome.runtime.lastError);
          resolve(DEFAULTS[key]);
          return;
        }
        resolve(result[key] !== undefined ? result[key] : DEFAULTS[key]);
      });
    });
  }

  async function setSetting(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[BiViShot] Storage error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  async function loadSettings() {
    const format = await getSetting('imageFormat');
    const quality = await getSetting('jpegQuality');
    const step = await getSetting('frameStep');

    // Format radio
    const formatRadio = document.querySelector(`input[name="format"][value="${format}"]`);
    if (formatRadio) formatRadio.checked = true;

    // Quality slider
    document.getElementById('quality').value = quality;
    document.getElementById('quality-value').textContent = `${quality}%`;
    document.getElementById('quality-group').style.display = format === 'jpeg' ? 'block' : 'none';

    // Frame step radio - find closest value
    const stepRadios = document.querySelectorAll('input[name="step"]');
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

  function setupListeners() {
    // Format change
    document.querySelectorAll('input[name="format"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        await setSetting('imageFormat', e.target.value);
        document.getElementById('quality-group').style.display = e.target.value === 'jpeg' ? 'block' : 'none';
      });
    });

    // Quality slider
    document.getElementById('quality').addEventListener('input', async (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('quality-value').textContent = `${value}%`;
      await setSetting('jpegQuality', value);
    });

    // Frame step change
    document.querySelectorAll('input[name="step"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        await setSetting('frameStep', parseFloat(e.target.value));
      });
    });

    // Reset to defaults
    document.getElementById('reset-position').addEventListener('click', async () => {
      await setSetting('imageFormat', DEFAULTS.imageFormat);
      await setSetting('jpegQuality', DEFAULTS.jpegQuality);
      await setSetting('frameStep', DEFAULTS.frameStep);
      await setSetting('toolbarPosition', DEFAULTS.toolbarPosition);
      loadSettings(); // Reload UI
    });
  }

  await loadSettings();
  setupListeners();
})();
