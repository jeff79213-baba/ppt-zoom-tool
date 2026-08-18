# 設計規格：手機橫向收合 + PWA 全螢幕 + 工具列簡化

日期：2026-08-17
狀態：Active

---

## 一、需求背景

手機橫向觀看簡報時，瀏覽器上下框（地址列 + 導覽列）已佔約 90px，加上工具列本身約 80px，簡報內容區被壓得非常扁（實測僅剩約 160px）。使用者希望：
1. 橫向時工具列自動收合，把空間還給內容
2. 透過 PWA 加入主畫面獲得真全螢幕（無瀏覽器框）
3. 全螢幕時工具列簡化排列（僅上下，不要左右側邊停靠）

---

## 二、功能 1：手機橫向自動收合

### 觸發條件
- `@media (orientation: landscape)` **且** 觸控裝置（`hover: none`）
- 或 JS 偵測：`window.innerWidth > window.innerHeight` 且 `matchMedia("(hover: none)").matches`

### 行為
| 事件 | 動作 |
|------|------|
| 進入橫向 | 自動收合（`setToolbarCollapsed(true)`） |
| 旋回直向 | 自動展開（`setToolbarCollapsed(false)`） |
| 使用者手動收合/展開 | 覆蓋自動行為，直到下次旋轉 |
| 全螢幕模式中 | 不套用橫向自動收合（全螢幕有自己的規則） |

### 實作方式
- JS：監聽 `orientationchange` 或 `resize`，判斷 `innerWidth > innerHeight`
- 維持一個 `landscapeAuto` flag，手動操作時清除
- CSS：無新增（`collapsed` class 已存在）

---

## 三、功能 2：PWA 支援（加入主畫面）

### 新增檔案
1. **`manifest.json`**：PWA 設定檔
2. **`sw.js`**：Service Worker（快取靜態資源，離線可用）
3. **`icon-192.png`** + **`icon-512.png`**：PWA 圖示（先用 placeholder）

### manifest.json 內容
```json
{
  "name": "簡報縮放導覽工具",
  "short_name": "簡報縮放",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#23272e",
  "theme_color": "#23272e",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### index.html 新增 meta tags
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#23272e">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="icon-192.png">
```

### sw.js 行為
- `install`：預快取 `index.html`、`css/style.css`、`js/app.js`、`manifest.json`
- `fetch`：cache-first 策略，離線時回退快取
- `activate`：清除舊版快取

### 提示橫幅（PWA hint）
- 首次在手機瀏覽器（非 standalone）開啟時，底部顯示橫幅：「加入主畫面可全螢幕觀看」
- 點 ✕ 或「知道了」關閉，記錄到 `localStorage.pptzoom_pwaHintDismissed`
- 僅顯示一次

---

## 四、功能 3：全螢幕時工具列簡化

### 觸發條件
- `document.fullscreenElement` 存在（桌面 F 鍵）
- **或** PWA standalone 模式（`matchMedia("(display-mode: standalone)").matches`）

### 行為
| 項目 | 全螢幕時 | 非全螢幕 |
|------|----------|----------|
| 工具列位置 | 固定底部（預設），可拖到上方 | 可拖到任意位置 |
| 釘選 | ✅ 可用 | ✅ 可用 |
| 左右側邊停靠 | ❌ 不套用 | ✅ 可用 |
| 橫向自動收合 | ❌ 不套用 | ✅ 可用 |
| 透明度 | ✅ 可用 | ✅ 可用 |

### 實作方式
- 拖動結束時，若在全螢幕模式，跳過 edge-left/edge-right class 判斷
- `setToolbarCollapsed` 在全螢幕模式下仍可手動觸發，但橫向自動收合不作用
- 新增 `isFullscreen()` 函數，回傳是否在全螢幕（含 PWA standalone）

---

## 五、CSS 版本號
更新為 `?v=20260817e`（index.html + app.js 同步）

---

## 六、邊界情況
| 情境 | 處理 |
|------|------|
| 橫向旋轉中（過渡） | 用 `resize` 事件 debounce（150ms）避免抖動 |
| PWA standalone + 橫向 | 全螢幕模式 → 不自動收合，工具列排底部 |
| 桌面全螢幕 | 不套用橫向自動收合，工具列可拖到上下 |
| iOS Safari（不支援 Fullscreen API） | PWA standalone 是唯一真全螢幕方式 |
| 從 PWA 切回瀏覽器 | 觸發 `display-mode` 變化，重新評估 |
