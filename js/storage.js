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
      frameStep: 0.033333,  // 1/30 second
      toolbarPosition: { x: 100, y: 100 }
    };

    async function get(key) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] !== undefined ? result[key] : DEFAULTS[key]);
        });
      });
    }

    async function set(key, value) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }

    async function getAll() {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
          resolve({ ...DEFAULTS, ...result });
        });
      });
    }

    return { get, set, getAll, DEFAULTS };
  })();
})();
