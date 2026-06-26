# BiViShot 设计文档

## 概述

BiViShot 是一个浏览器扩展（Chrome + Edge），用于截取 B 站视频帧并保存为图片。核心优势是直接从视频元素提取原始帧数据，实现近乎无损的截图质量。

## 功能需求

1. **截图到文件** — 将当前视频帧保存为 PNG/JPEG 文件
2. **截图到剪贴板** — 将当前视频帧复制到系统剪贴板
3. **上一帧** — 视频暂停时，跳转到上一帧
4. **下一帧** — 视频暂停时，跳转到下一帧
5. **可拖动工具条** — 纯图标悬浮球，支持拖动和位置记忆
6. **设置界面** — 配置截图格式、帧步长等

## 技术架构

### 项目结构

```
BiViShot/
├── manifest.json          # 扩展配置
├── icons/                 # 图标资源 (16/32/48/128px)
├── js/
│   ├── content.js         # 入口文件，协调各模块
│   ├── toolbar.js         # 工具条 UI 创建、拖动、位置记忆
│   ├── capture.js         # 截图逻辑（文件下载 + 剪贴板）
│   ├── frame-nav.js       # 帧导航逻辑（上一帧/下一帧）
│   └── storage.js         # Chrome Storage API 封装
├── css/
│   └── toolbar.css        # 工具条样式
└── popup/
    ├── popup.html         # 设置弹窗
    └── popup.js           # 设置逻辑
```

### 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| `content.js` | 注入页面，初始化各模块，监听页面变化 | 所有模块 |
| `toolbar.js` | 创建 DOM、拖动逻辑、位置存储/恢复 | storage, capture, frame-nav |
| `capture.js` | OffscreenCanvas 截图、下载文件、写入剪贴板 | storage |
| `frame-nav.js` | 计算时间步长、设置 video.currentTime | storage |
| `storage.js` | 封装 chrome.storage.local 的 get/set | 无 |

## UI 设计

### 悬浮工具条

```
┌─────────────────────────────────────────┐
│                                         │
│    ┌─────────────────────────────────┐  │
│    │ 📷  📋  ⏮  ⏭  ⚙️  │  │
│    └─────────────────────────────────┘  │
│         ↑ 半透明圆角矩形背景             │
│         ↑ 图标间距均匀                   │
│                                         │
└─────────────────────────────────────────┘
```

**图标功能：**

| 图标 | 功能 | Hover 提示 |
|------|------|-----------|
| 📷 | 截图到文件 | "保存截图" |
| 📋 | 截图到剪贴板 | "复制到剪贴板" |
| ⏮ | 上一帧 | "上一帧 (需暂停)" |
| ⏭ | 下一帧 | "下一帧 (需暂停)" |
| ⚙️ | 打开设置 | "设置" |

**样式细节：**
- 背景：`rgba(0, 0, 0, 0.75)` 半透明黑
- 圆角：`8px`
- 图标大小：`20px × 20px`
- 内边距：`8px 12px`
- 阴影：`0 2px 8px rgba(0,0,0,0.3)`
- Hover 效果：图标放大 1.1x + 背景变亮

**拖动实现：**
- 鼠标按下工具条 → 记录初始位置
- 鼠标移动 → 更新工具条位置
- 鼠标松开 → 保存位置到 chrome.storage.local
- 限制拖动范围在视频区域内

**位置记忆：**
- 存储键：`toolbarPosition`
- 值：`{ x: 100, y: 100 }`（相对于视频元素的坐标）
- 首次安装默认位置：视频左上角

### 设置界面

```
┌─────────────────────────────────────┐
│  BiViShot 设置                       │
├─────────────────────────────────────┤
│                                     │
│  截图格式：                          │
│  ○ PNG (无损)  ● JPEG (有损)        │
│                                     │
│  JPEG 质量：  [====████====] 95%    │
│                                     │
│  帧步长：                            │
│  ○ 1/24秒  ● 1/30秒  ○ 1/60秒      │
│                                     │
│  工具条位置：                        │
│  [重置为默认位置]                     │
│                                     │
│  ─────────────────────────────────  │
│  v1.0.0                             │
└─────────────────────────────────────┘
```

**设置项：**
- 截图格式：PNG / JPEG
- JPEG 质量：1-100 滑块
- 帧步长：1/24秒 / 1/30秒 / 1/60秒
- 重置工具条位置

## 核心实现

### 截图功能

**视频元素选择器：**
```javascript
const video = document.querySelector('.bpx-player-video-wrap video')
  || document.querySelector('#bilibili-player video')
  || document.querySelector('video');
```

**截图流程：**
1. 获取 video 元素
2. 创建 OffscreenCanvas (videoWidth × videoHeight)
3. ctx.drawImage(video, 0, 0, ...)
4. convertToBlob({ type: 'image/png' 或 'image/jpeg' })
5. 下载文件 或 写入剪贴板

**截图到文件：**
```javascript
const blob = await canvas.convertToBlob({ type: format });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `bivishot-${timestamp}.png`;
a.click();
URL.revokeObjectURL(url);
```

**截图到剪贴板：**
```javascript
const blob = await canvas.convertToBlob({ type: format });
await navigator.clipboard.write([
  new ClipboardItem({ [blob.type]: blob })
]);
```

**文件命名规则：**
- 格式：`bivishot-YYYYMMDD-HHmmss.png`
- 示例：`bivishot-20260626-143022.png`

### 帧导航功能

**核心逻辑：**
```javascript
function previousFrame() {
  if (!video.paused) return;
  video.currentTime = Math.max(0, video.currentTime - frameStep);
}

function nextFrame() {
  if (!video.paused) return;
  video.currentTime = Math.min(video.duration, video.currentTime + frameStep);
}
```

**时间步长：**
- 默认：1/30 秒 ≈ 0.033333 秒
- 可配置值：1/24, 1/30, 1/60

**按钮状态管理：**
- 播放中：帧导航按钮禁用（灰色半透明）
- 暂停时：按钮启用，可点击

### B站 SPA 适配

```javascript
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    reinitToolbar();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

### 视频元素动态加载

```javascript
function waitForVideo() {
  return new Promise((resolve) => {
    const video = document.querySelector('.bpx-player-video-wrap video');
    if (video) {
      resolve(video);
      return;
    }
    const observer = new MutationObserver(() => {
      const video = document.querySelector('.bpx-player-video-wrap video');
      if (video) {
        observer.disconnect();
        resolve(video);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
```

## 数据存储

**chrome.storage.local 存储结构：**
```javascript
{
  imageFormat: 'png',        // 'png' | 'jpeg'
  jpegQuality: 95,           // 1-100
  frameStep: 0.033333,       // 帧步长（秒）
  toolbarPosition: { x: 100, y: 100 }  // 工具条位置
}
```

## Manifest 配置

**权限：**
- `storage` — 存储用户设置和工具条位置
- `clipboardWrite` — 写入剪贴板

**注入页面：**
- `*://*.bilibili.com/video/*` — 视频详情页
- `*://*.bilibili.com/list/*` — 播放列表页
- `*://*.bilibili.com/bangumi/*` — 番剧页

**JS 加载顺序：**
1. `storage.js` — 基础工具，无依赖
2. `capture.js` — 截图逻辑
3. `frame-nav.js` — 帧导航
4. `toolbar.js` — UI
5. `content.js` — 入口

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 视频元素未找到 | 工具条不显示，控制台打印警告 |
| 视频未加载完成 | 截图按钮禁用，显示"加载中" |
| 剪贴板 API 不可用 | 隐藏"截图到剪贴板"按钮 |
| 视频跨域限制 | 显示提示"无法截图（跨域限制）" |
| 页面切换（SPA） | 监听 URL 变化，重新初始化 |

## 浏览器兼容性

- Chrome 88+ (Manifest V3)
- Edge 88+ (Manifest V3)
- 两者基于 Chromium，代码通用

## 参考项目

- [BilibiliVideoCaptureImage](https://github.com/Vant1032/BilibiliVideoCaptureImage)
- 核心技术：OffscreenCanvas + drawImage()
- 已验证的视频元素选择器：`.bpx-player-video-wrap video`
