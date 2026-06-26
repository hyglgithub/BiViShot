# CLAUDE.md - BiViShot Project Guide

## Project Overview

BiViShot is a Chrome/Edge browser extension (Manifest V3) that captures B站 (Bilibili) video frames as images. It uses OffscreenCanvas for near-lossless frame extraction.

## Architecture

**Modular content script architecture** with IIFE-wrapped modules communicating via `window.BiViShot` namespace:

- `storage.js` - Chrome Storage API wrapper with default values (single source of truth)
- `capture.js` - OffscreenCanvas frame extraction, file download, clipboard support
- `frame-nav.js` - Frame navigation (previous/next) with configurable step
- `toolbar.js` - Floating toolbar UI, drag handling, settings panel, long press support
- `content.js` - Entry point, SPA navigation detection, video element discovery

## Key Technical Decisions

1. **IIFE Pattern**: Each module is wrapped in `(function() { ... })()` to avoid global scope pollution
2. **window.BiViShot**: Modules communicate via `window.BiViShot` namespace (not `const`/`var` declarations)
3. **Fixed Positioning**: Toolbar uses `position: fixed` to avoid overflow clipping on B站 player
4. **AbortController**: Event listeners use AbortController for clean removal on SPA navigation
5. **PNG for Clipboard**: Clipboard always uses PNG format (ClipboardItem doesn't support JPEG reliably)
6. **JPEG→PNG Conversion**: When JPEG is selected, clipboard copies JPEG quality then converts to PNG

## Default Values (storage.js DEFAULTS)

```javascript
{
  imageFormat: 'png',
  jpegQuality: 95,
  frameStep: 0.2,  // 1/5 second
  toolbarPosition: { x: 100, y: 100 }
}
```

## Frame Step Options

| Value | Label |
|-------|-------|
| 1.0   | 1/1   |
| 0.2   | 1/5   |
| 0.066667 | 1/15 |
| 0.033333 | 1/30 |

## Build & Test

This is a pure vanilla JS extension with no build step. To test:

1. Open `chrome://extensions/` or `edge://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" and select the project directory
4. Navigate to a B站 video page

## Common Issues

### Toolbar not visible
- Check browser console for errors
- Verify extension is loaded in `chrome://extensions/`
- Refresh the B站 page after reloading extension

### Double frame navigation
- Should be fixed (uses `createButtonNoClick` for long press buttons)
- If still occurs, check for duplicate event listeners

### Clipboard not working
- Clipboard API requires user gesture
- Some browsers may block clipboard access
- Always uses PNG format for compatibility

## File Organization

```
BiViShot/
├── manifest.json      # Extension config (MV3)
├── js/
│   ├── storage.js     # DEFAULTS object is single source of truth
│   ├── capture.js     # VIDEO_SELECTORS and getVideoElement() defined here
│   ├── frame-nav.js   # Delegates to capture.getVideoElement()
│   ├── toolbar.js     # Main UI, settings panel, drag handling
│   └── content.js     # Entry point, SPA detection
├── css/
│   └── toolbar.css    # All styles (bivishot-* prefix)
├── icons/             # Extension icons (16/32/48/128px)
└── popup/             # Extension popup settings
    ├── popup.html
    └── popup.js
```

## Code Patterns

### Creating a button with click handler
```javascript
const btn = createButton('actionId', ICONS.icon, 'Tooltip text', () => {
  // onClick handler
});
```

### Creating a button with long press (no click handler)
```javascript
const btn = createButtonNoClick('actionId', ICONS.icon, 'Tooltip text');
setupLongPress(btn, () => {
  // action to repeat on long press
});
```

### Accessing storage
```javascript
const value = await window.BiViShot.storage.get('key');
await window.BiViShot.storage.set('key', value);
const DEFAULTS = window.BiViShot.storage.DEFAULTS;
```

## Git Workflow

- Main branch: `main`
- Development branch: `master`
- Commit messages follow conventional commits format

## Dependencies

- No external dependencies
- Pure vanilla JavaScript
- Chrome Extension Manifest V3 APIs (storage, clipboardWrite)
