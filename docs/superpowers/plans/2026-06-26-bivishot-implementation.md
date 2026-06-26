# BiViShot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome/Edge extension that captures B站 video frames as images with a floating toolbar UI.

**Architecture:** Modular content script architecture with 5 JS modules (storage, capture, frame-nav, toolbar, content) injected into B站 video pages. Uses OffscreenCanvas for lossless frame extraction.

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JavaScript (no frameworks), Chrome Storage API, Clipboard API, OffscreenCanvas API

## Global Constraints

- Manifest V3 only (Chrome 88+, Edge 88+)
- No external dependencies — pure vanilla JS
- All strings in Chinese (UI) and English (code/comments)
- Video element selector: `.bpx-player-video-wrap video` (primary), fallback to `video`
- File naming: `bivishot-YYYYMMDD-HHmmss.png`
- Default frame step: 1/30 second
- Default image format: PNG

---

### Task 1: Project Initialization

**Files:**
- Create: `manifest.json`
- Create: `js/` directory
- Create: `css/` directory
- Create: `icons/` directory
- Create: `popup/` directory

**Interfaces:**
- Produces: Project skeleton for all subsequent tasks

- [ ] **Step 1: Initialize git repository**

```bash
cd C:/Users/31548/Desktop/JustPlay/BiViShot
git init
```

- [ ] **Step 2: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "BiViShot",
  "version": "1.0.0",
  "description": "B站视频帧截图工具 - 无损截取视频画面",
  "permissions": [
    "storage",
    "clipboardWrite"
  ],
  "host_permissions": [
    "*://*.bilibili.com/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "*://*.bilibili.com/video/*",
        "*://*.bilibili.com/list/*",
        "*://*.bilibili.com/bangumi/*"
      ],
      "js": [
        "js/storage.js",
        "js/capture.js",
        "js/frame-nav.js",
        "js/toolbar.js",
        "js/content.js"
      ],
      "css": ["css/toolbar.css"]
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p js css icons popup
```

- [ ] **Step 4: Create placeholder files**

```bash
touch js/storage.js js/capture.js js/frame-nav.js js/toolbar.js js/content.js
touch css/toolbar.css
touch popup/popup.html popup/popup.js
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: initialize project structure with manifest.json"
```

---

### Task 2: Storage Module

**Files:**
- Create: `js/storage.js`

**Interfaces:**
- Produces: `BiViShot.storage` object with methods:
  - `get(key)` → `Promise<any>`
  - `set(key, value)` → `Promise<void>`
  - `getAll()` → `Promise<object>`
- Default values:
  - `imageFormat`: `'png'`
  - `jpegQuality`: `95`
  - `frameStep`: `0.033333`
  - `toolbarPosition`: `{ x: 100, y: 100 }`

- [ ] **Step 1: Implement storage.js**

```javascript
/**
 * BiViShot Storage Module
 * Wraps chrome.storage.local with default values
 */
const BiViShot = window.BiViShot || {};

BiViShot.storage = (() => {
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

window.BiViShot = BiViShot;
```

- [ ] **Step 2: Verify file is valid JavaScript**

```bash
node -c js/storage.js
```

Expected: No output (valid syntax)

- [ ] **Step 3: Commit**

```bash
git add js/storage.js
git commit -m "feat: implement storage module with Chrome Storage API wrapper"
```

---

### Task 3: Capture Module

**Files:**
- Create: `js/capture.js`

**Interfaces:**
- Consumes: `BiViShot.storage.get(key)`
- Produces: `BiViShot.capture` object with methods:
  - `captureToFile()` → `Promise<void>` — downloads image file
  - `captureToClipboard()` → `Promise<void>` — copies to clipboard
  - `getVideoElement()` → `HTMLVideoElement | null`
  - `isClipboardSupported()` → `boolean`

- [ ] **Step 1: Implement capture.js**

```javascript
/**
 * BiViShot Capture Module
 * Captures video frames using OffscreenCanvas
 */
const BiViShot = window.BiViShot || {};

BiViShot.capture = (() => {
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

    const format = await BiViShot.storage.get('imageFormat');
    const quality = await BiViShot.storage.get('jpegQuality');

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

    const format = await BiViShot.storage.get('imageFormat');
    const quality = await BiViShot.storage.get('jpegQuality');

    try {
      const blob = await captureFrame(video, format, quality);
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
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

window.BiViShot = BiViShot;
```

- [ ] **Step 2: Verify file is valid JavaScript**

```bash
node -c js/capture.js
```

Expected: No output (valid syntax)

- [ ] **Step 3: Commit**

```bash
git add js/capture.js
git commit -m "feat: implement capture module with OffscreenCanvas frame extraction"
```

---

### Task 4: Frame Navigation Module

**Files:**
- Create: `js/frame-nav.js`

**Interfaces:**
- Consumes: `BiViShot.storage.get(key)`
- Produces: `BiViShot.frameNav` object with methods:
  - `previousFrame()` → `void`
  - `nextFrame()` → `void`
  - `isPaused()` → `boolean`

- [ ] **Step 1: Implement frame-nav.js**

```javascript
/**
 * BiViShot Frame Navigation Module
 * Navigate between video frames when paused
 */
const BiViShot = window.BiViShot || {};

BiViShot.frameNav = (() => {
  function getVideoElement() {
    return BiViShot.capture ? BiViShot.capture.getVideoElement() : null;
  }

  function isPaused() {
    const video = getVideoElement();
    return video ? video.paused : false;
  }

  async function previousFrame() {
    const video = getVideoElement();
    if (!video || !video.paused) return;

    const frameStep = await BiViShot.storage.get('frameStep');
    video.currentTime = Math.max(0, video.currentTime - frameStep);
  }

  async function nextFrame() {
    const video = getVideoElement();
    if (!video || !video.paused) return;

    const frameStep = await BiViShot.storage.get('frameStep');
    video.currentTime = Math.min(video.duration, video.currentTime + frameStep);
  }

  return { previousFrame, nextFrame, isPaused };
})();

window.BiViShot = BiViShot;
```

- [ ] **Step 2: Verify file is valid JavaScript**

```bash
node -c js/frame-nav.js
```

Expected: No output (valid syntax)

- [ ] **Step 3: Commit**

```bash
git add js/frame-nav.js
git commit -m "feat: implement frame navigation module for prev/next frame"
```

---

### Task 5: Toolbar Styles

**Files:**
- Create: `css/toolbar.css`

**Interfaces:**
- Produces: CSS classes for toolbar UI
  - `.bivishot-toolbar` — main container
  - `.bivishot-btn` — button base
  - `.bivishot-btn:hover` — hover effect
  - `.bivishot-btn.disabled` — disabled state
  - `.bivishot-tooltip` — hover tooltip

- [ ] **Step 1: Implement toolbar.css**

```css
/**
 * BiViShot Toolbar Styles
 * Floating icon toolbar for video frame capture
 */

.bivishot-toolbar {
  position: absolute;
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: grab;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.bivishot-toolbar:active {
  cursor: grabbing;
}

.bivishot-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.bivishot-btn svg {
  width: 20px;
  height: 20px;
  fill: #ffffff;
  transition: transform 0.15s ease;
}

.bivishot-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.bivishot-btn:hover svg {
  transform: scale(1.1);
}

.bivishot-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bivishot-btn.disabled:hover {
  background: transparent;
}

.bivishot-btn.disabled:hover svg {
  transform: none;
}

/* Tooltip */
.bivishot-btn .bivishot-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  font-size: 12px;
  white-space: nowrap;
  border-radius: 4px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.bivishot-btn:hover .bivishot-tooltip {
  opacity: 1;
}

/* Toast notification */
.bivishot-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  z-index: 999999;
  animation: bivishot-toast-in 0.3s ease, bivishot-toast-out 0.3s ease 1.7s;
  animation-fill-mode: forwards;
}

@keyframes bivishot-toast-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bivishot-toast-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/toolbar.css
git commit -m "feat: implement toolbar styles with hover effects and tooltips"
```

---

### Task 6: Toolbar Module

**Files:**
- Create: `js/toolbar.js`

**Interfaces:**
- Consumes:
  - `BiViShot.storage.get(key)` / `BiViShot.storage.set(key, value)`
  - `BiViShot.capture.captureToFile()` / `BiViShot.capture.captureToClipboard()` / `BiViShot.capture.isClipboardSupported()`
  - `BiViShot.frameNav.previousFrame()` / `BiViShot.frameNav.nextFrame()` / `BiViShot.frameNav.isPaused()`
- Produces: `BiViShot.toolbar` object with methods:
  - `init(videoElement)` → `void` — creates and attaches toolbar
  - `destroy()` → `void` — removes toolbar
  - `updateFrameButtons()` → `void` — updates disabled state

- [ ] **Step 1: Implement toolbar.js**

```javascript
/**
 * BiViShot Toolbar Module
 * Creates floating draggable toolbar with capture controls
 */
const BiViShot = window.BiViShot || {};

BiViShot.toolbar = (() => {
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
      const videoRect = videoEl.getBoundingClientRect();
      let x = e.clientX - dragOffset.x - videoRect.left;
      let y = e.clientY - dragOffset.y - videoRect.top;

      // Clamp to video bounds
      const toolbarRect = toolbarEl.getBoundingClientRect();
      x = Math.max(0, Math.min(x, videoRect.width - toolbarRect.width));
      y = Math.max(0, Math.min(y, videoRect.height - toolbarRect.height));

      toolbarEl.style.left = `${x}px`;
      toolbarEl.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', async () => {
      if (!isDragging) return;
      isDragging = false;
      await BiViShot.storage.set('toolbarPosition', {
        x: parseInt(toolbarEl.style.left),
        y: parseInt(toolbarEl.style.top)
      });
    });
  }

  function updateFrameButtons() {
    if (!toolbarEl) return;
    const paused = BiViShot.frameNav.isPaused();
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
      await BiViShot.capture.captureToFile();
      showToast('截图已保存');
    }));

    // Capture to clipboard (hide if not supported)
    if (BiViShot.capture.isClipboardSupported()) {
      toolbarEl.appendChild(createButton('clipboard', ICONS.clipboard, TOOLTIPS.clipboard, async () => {
        await BiViShot.capture.captureToClipboard();
        showToast('已复制到剪贴板');
      }));
    }

    // Previous frame
    toolbarEl.appendChild(createButton('prevFrame', ICONS.prevFrame, TOOLTIPS.prevFrame, () => {
      BiViShot.frameNav.previousFrame();
    }));

    // Next frame
    toolbarEl.appendChild(createButton('nextFrame', ICONS.nextFrame, TOOLTIPS.nextFrame, () => {
      BiViShot.frameNav.nextFrame();
    }));

    // Settings
    toolbarEl.appendChild(createButton('settings', ICONS.settings, TOOLTIPS.settings, () => {
      BiViShot.settings.toggle();
    }));

    // Position toolbar
    const position = await BiViShot.storage.get('toolbarPosition');
    toolbarEl.style.left = `${position.x}px`;
    toolbarEl.style.top = `${position.y}px`;

    // Attach to video container
    const container = video.closest('.bpx-player-video-wrap') || video.parentElement;
    container.style.position = 'relative';
    container.appendChild(toolbarEl);

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

window.BiViShot = BiViShot;
```

- [ ] **Step 2: Verify file is valid JavaScript**

```bash
node -c js/toolbar.js
```

Expected: No output (valid syntax)

- [ ] **Step 3: Commit**

```bash
git add js/toolbar.js
git commit -m "feat: implement toolbar module with drag, tooltips, and button actions"
```

---

### Task 7: Content Script Entry Point

**Files:**
- Create: `js/content.js`

**Interfaces:**
- Consumes: All BiViShot modules
- Produces: Page initialization logic

- [ ] **Step 1: Implement content.js**

```javascript
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
```

- [ ] **Step 2: Verify file is valid JavaScript**

```bash
node -c js/content.js
```

Expected: No output (valid syntax)

- [ ] **Step 3: Commit**

```bash
git add js/content.js
git commit -m "feat: implement content script entry point with SPA navigation handling"
```

---

### Task 8: Settings Popup

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.js`

**Interfaces:**
- Consumes: `BiViShot.storage.get(key)` / `BiViShot.storage.set(key, value)`

- [ ] **Step 1: Implement popup.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 300px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a1a;
      color: #ffffff;
    }
    h2 {
      font-size: 16px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #333;
    }
    .setting-group {
      margin-bottom: 16px;
    }
    .setting-label {
      font-size: 13px;
      color: #aaa;
      margin-bottom: 8px;
    }
    .radio-group {
      display: flex;
      gap: 12px;
    }
    .radio-group label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      cursor: pointer;
    }
    .slider-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    input[type="range"] {
      flex: 1;
      accent-color: #00a1d6;
    }
    .slider-value {
      font-size: 13px;
      min-width: 35px;
      text-align: right;
    }
    button.reset-btn {
      width: 100%;
      padding: 8px;
      background: #333;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    button.reset-btn:hover {
      background: #444;
    }
    .version {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #333;
    }
  </style>
</head>
<body>
  <h2>BiViShot 设置</h2>

  <div class="setting-group">
    <div class="setting-label">截图格式</div>
    <div class="radio-group">
      <label><input type="radio" name="format" value="png"> PNG (无损)</label>
      <label><input type="radio" name="format" value="jpeg"> JPEG (有损)</label>
    </div>
  </div>

  <div class="setting-group" id="quality-group">
    <div class="setting-label">JPEG 质量</div>
    <div class="slider-container">
      <input type="range" id="quality" min="1" max="100" value="95">
      <span class="slider-value" id="quality-value">95%</span>
    </div>
  </div>

  <div class="setting-group">
    <div class="setting-label">帧步长</div>
    <div class="radio-group">
      <label><input type="radio" name="step" value="0.041667"> 1/24秒</label>
      <label><input type="radio" name="step" value="0.033333"> 1/30秒</label>
      <label><input type="radio" name="step" value="0.016667"> 1/60秒</label>
    </div>
  </div>

  <div class="setting-group">
    <button class="reset-btn" id="reset-position">重置工具条位置</button>
  </div>

  <div class="version">v1.0.0</div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Implement popup.js**

```javascript
/**
 * BiViShot Settings Popup
 * Manages user preferences
 */
(async function() {
  'use strict';

  // Wait for BiViShot storage module to load
  function waitForStorage() {
    return new Promise((resolve) => {
      if (window.BiViShot && window.BiViShot.storage) {
        resolve();
        return;
      }
      // Content scripts may not have loaded yet in popup context
      // Use chrome.storage.local directly
      resolve();
    });
  }

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
```

- [ ] **Step 3: Verify files are valid**

```bash
node -c popup/popup.js
```

Expected: No output (valid syntax)

- [ ] **Step 4: Commit**

```bash
git add popup/popup.html popup/popup.js
git commit -m "feat: implement settings popup with format, quality, and step options"
```

---

### Task 9: Settings Module (Toolbar Integration)

**Files:**
- Create: `js/settings.js`
- Modify: `manifest.json` — add `js/settings.js` to content_scripts

**Interfaces:**
- Produces: `BiViShot.settings` object with methods:
  - `toggle()` → `void` — show/hide settings panel inline

- [ ] **Step 1: Implement settings.js**

```javascript
/**
 * BiViShot Settings Module (Inline)
 * Shows settings panel directly on the page
 */
const BiViShot = window.BiViShot || {};

BiViShot.settings = (() => {
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

    // Style the panel
    Object.assign(panel.style, {
      position: 'absolute',
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
    const format = await BiViShot.storage.get('imageFormat');
    const quality = await BiViShot.storage.get('jpegQuality');
    const step = await BiViShot.storage.get('frameStep');

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
        await BiViShot.storage.set('imageFormat', e.target.value);
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
        await BiViShot.storage.set('jpegQuality', val);
      });
    }

    panelEl.querySelectorAll('input[name="bvs-step"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        await BiViShot.storage.set('frameStep', parseFloat(e.target.value));
      });
    });

    const resetBtn = panelEl.querySelector('#bvs-reset-pos');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        await BiViShot.storage.set('toolbarPosition', { x: 100, y: 100 });
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
    const video = BiViShot.capture.getVideoElement();
    const container = video ? (video.closest('.bpx-player-video-wrap') || video.parentElement) : document.body;
    container.appendChild(panelEl);
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

window.BiViShot = BiViShot;
```

- [ ] **Step 2: Update manifest.json to include settings.js**

Add `"js/settings.js"` before `"js/toolbar.js"` in the content_scripts.js array:

```json
"js": [
  "js/storage.js",
  "js/capture.js",
  "js/frame-nav.js",
  "js/settings.js",
  "js/toolbar.js",
  "js/content.js"
]
```

- [ ] **Step 3: Add settings panel styles to toolbar.css**

Append to `css/toolbar.css`:

```css
/* Settings Panel */
.bivishot-settings-panel .bivishot-settings-header {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}

.bivishot-settings-panel .bivishot-settings-group {
  margin-bottom: 12px;
}

.bivishot-settings-panel .bivishot-settings-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}

.bivishot-settings-panel .bivishot-settings-radios {
  display: flex;
  gap: 10px;
}

.bivishot-settings-panel .bivishot-settings-radios label {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 12px;
}

.bivishot-settings-panel .bivishot-settings-slider {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bivishot-settings-panel input[type="range"] {
  flex: 1;
  accent-color: #00a1d6;
}

.bivishot-settings-panel .bivishot-settings-reset {
  width: 100%;
  padding: 6px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 4px;
}

.bivishot-settings-panel .bivishot-settings-reset:hover {
  background: #444;
}
```

- [ ] **Step 4: Verify files**

```bash
node -c js/settings.js
```

Expected: No output (valid syntax)

- [ ] **Step 5: Commit**

```bash
git add js/settings.js css/toolbar.css manifest.json
git commit -m "feat: implement inline settings panel with format, quality, and step options"
```

---

### Task 10: Icons

**Files:**
- Create: `icons/icon-16.png`
- Create: `icons/icon-32.png`
- Create: `icons/icon-48.png`
- Create: `icons/icon-128.png`

**Interfaces:**
- Produces: PNG icon files for extension

- [ ] **Step 1: Create SVG icon**

Create `icons/icon.svg` as source:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="20" fill="#00a1d6"/>
  <g transform="translate(24, 24)" fill="white">
    <!-- Camera body -->
    <rect x="8" y="24" width="64" height="44" rx="6" fill="none" stroke="white" stroke-width="5"/>
    <!-- Lens -->
    <circle cx="40" cy="46" r="14" fill="none" stroke="white" stroke-width="5"/>
    <!-- Flash -->
    <rect x="24" y="16" width="16" height="8" rx="2"/>
  </g>
</svg>
```

- [ ] **Step 2: Generate PNG icons using ImageMagick or similar**

If ImageMagick is available:
```bash
convert icons/icon.svg -resize 16x16 icons/icon-16.png
convert icons/icon.svg -resize 32x32 icons/icon-32.png
convert icons/icon.svg -resize 48x48 icons/icon-48.png
convert icons/icon.svg -resize 128x128 icons/icon-128.png
```

If not available, create placeholder PNGs using a simple script or manually provide icon files.

- [ ] **Step 3: Commit**

```bash
git add icons/
git commit -m "feat: add extension icons in multiple sizes"
```

---

### Task 11: README and Documentation

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: Project documentation

- [ ] **Step 1: Create README.md**

```markdown
# BiViShot

B站视频帧截图工具 - Chrome/Edge 浏览器扩展

## 功能

- 📷 **视频截图到文件** — 保存当前视频帧为 PNG/JPEG 图片
- 📋 **视频截图到剪贴板** — 复制当前视频帧到系统剪贴板
- ⏮ **上一帧** — 视频暂停时逐帧后退
- ⏭ **下一帧** — 视频暂停时逐帧前进
- ⚙️ **设置** — 配置截图格式、质量、帧步长

## 安装

### Chrome

1. 下载或克隆本仓库
2. 打开 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目目录（包含 `manifest.json` 的目录）

### Edge

1. 下载或克隆本仓库
2. 打开 `edge://extensions/`
3. 开启"开发者模式"
4. 点击"加载解压缩"
5. 选择本项目目录

## 使用方法

1. 打开 B 站视频页面
2. 视频区域会出现悬浮工具条
3. 点击工具条上的按钮进行操作

### 工具条功能

| 按钮 | 功能 | 说明 |
|------|------|------|
| 📷 | 保存截图 | 下载当前视频帧为图片文件 |
| 📋 | 复制到剪贴板 | 将当前视频帧复制到剪贴板 |
| ⏮ | 上一帧 | 视频暂停时可用 |
| ⏭ | 下一帧 | 视频暂停时可用 |
| ⚙️ | 设置 | 配置截图格式等选项 |

### 拖动工具条

- 按住工具条空白区域拖动
- 松开后位置自动保存

## 技术原理

直接从 `<video>` 元素提取原始帧数据，使用 `OffscreenCanvas` 绘制后转换为图片。由于不经过编码压缩，截图质量接近无损。

## 文件大小参考

| 分辨率 | PNG 大小 |
|--------|----------|
| 4K     | ~7MB     |
| 1080p  | ~2.1MB   |
| 720p   | ~700KB   |

## 兼容性

- Chrome 88+
- Edge 88+

## 许可证

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```

---

### Task 12: Final Verification

**Files:**
- Verify all files exist and are syntactically correct

- [ ] **Step 1: Verify all JS files**

```bash
node -c js/storage.js && echo "storage.js OK"
node -c js/capture.js && echo "capture.js OK"
node -c js/frame-nav.js && echo "frame-nav.js OK"
node -c js/settings.js && echo "settings.js OK"
node -c js/toolbar.js && echo "toolbar.js OK"
node -c js/content.js && echo "content.js OK"
```

Expected: All files pass syntax check

- [ ] **Step 2: Verify manifest.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('manifest.json OK')"
```

Expected: `manifest.json OK`

- [ ] **Step 3: Verify file structure**

```bash
find . -not -path './.git/*' -type f | sort
```

Expected output:
```
./README.md
./css/toolbar.css
./icons/icon-16.png
./icons/icon-32.png
./icons/icon-48.png
./icons/icon-128.png
./icons/icon.svg
./js/capture.js
./js/content.js
./js/frame-nav.js
./js/settings.js
./js/storage.js
./js/toolbar.js
./manifest.json
./popup/popup.html
./popup/popup.js
```

- [ ] **Step 4: Push to remote**

```bash
git remote add origin https://github.com/hyglgithub/BiViShot.git
git branch -M main
git push -u origin main
```

- [ ] **Step 5: Manual testing checklist**

Load the extension in Chrome/Edge and verify:
1. [ ] Extension loads without errors in `chrome://extensions/`
2. [ ] Navigate to a B站 video page — toolbar appears
3. [ ] Click capture button — PNG file downloads
4. [ ] Click clipboard button — image copied to clipboard
5. [ ] Pause video — prev/next frame buttons become active
6. [ ] Click prev/next — video frame changes
7. [ ] Drag toolbar — position updates
8. [ ] Refresh page — toolbar position remembered
9. [ ] Click settings — settings panel appears
10. [ ] Change format to JPEG — capture saves as JPEG
11. [ ] Change frame step — prev/next uses new step
