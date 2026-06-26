/**
 * BiViShot Storage Module
 * Wraps chrome.storage.local with default values
 */
(function() {
  'use strict';

  window.BiViShot = window.BiViShot || {};

  window.BiViShot.storage = (() => {
    const DEFAULTS = {
      imageFormat: 'png',
      jpegQuality: 95,
      frameStep: 0.2,  // 1/5 second
      toolbarPosition: { x: 100, y: 100 }
    };

    async function get(key) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('[BiViShot] Storage get error:', chrome.runtime.lastError);
            resolve(DEFAULTS[key]);
            return;
          }
          resolve(result[key] !== undefined ? result[key] : DEFAULTS[key]);
        });
      });
    }

    async function set(key, value) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[BiViShot] Storage set error:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    }

    async function getAll() {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('[BiViShot] Storage getAll error:', chrome.runtime.lastError);
            resolve({ ...DEFAULTS });
            return;
          }
          resolve({ ...DEFAULTS, ...result });
        });
      });
    }

    return { get, set, getAll, DEFAULTS };
  })();
})();
