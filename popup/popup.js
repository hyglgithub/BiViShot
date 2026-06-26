/**
 * BiViShot Settings Popup
 * Manages user preferences
 */
(async function() {
  'use strict';

  async function getSetting(key, defaultValue) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  }

  async function setSetting(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  async function loadSettings() {
    const format = await getSetting('imageFormat', 'png');
    const quality = await getSetting('jpegQuality', 95);
    const step = await getSetting('frameStep', 0.033333);

    // Format radio
    document.querySelector(`input[name="format"][value="${format}"]`).checked = true;

    // Quality slider
    document.getElementById('quality').value = quality;
    document.getElementById('quality-value').textContent = `${quality}%`;
    document.getElementById('quality-group').style.display = format === 'jpeg' ? 'block' : 'none';

    // Frame step radio
    document.querySelector(`input[name="step"][value="${step}"]`).checked = true;
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

    // Reset position
    document.getElementById('reset-position').addEventListener('click', async () => {
      await setSetting('toolbarPosition', { x: 100, y: 100 });
    });
  }

  await loadSettings();
  setupListeners();
})();
