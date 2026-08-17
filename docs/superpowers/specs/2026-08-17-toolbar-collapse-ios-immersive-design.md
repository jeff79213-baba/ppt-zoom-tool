# 設計規格：工具列收合 ＋ iOS 沉浸模式

日期：2026-08-17
狀態：已獲使用者確認

## 一、問題

1. **工具列過大擋住主畫面**：目前工具列內容很多（☰＋新增＋檔名＋翻頁＋4 工具＋縮放＋筆選項＋undo/clear/reset＋全螢幕＋透明度＋釘選），桌面版無 max-width 限制、手機版兩排換行，整體佔據過多畫面，遮擋簡報內容。
2. **iOS 上全螢幕無作用**：iOS Safari 不支援非影片元素的 Fullscreen API，`document.documentElement.requestFullscreen` 與 `webkitRequestFullscreen` 皆為 undefined（js/app.js:674），導致 `if (req)` 直接跳過，按鈕按了完全沒反應。

## 二、設計

### 1. 工具列收合按鈕（跨平台）

- 工具列**最右側**（釘選鈕 `#tb-pin` 右邊）新增收合按鈕 `#tb-collapse`
- 圖示：下收合箭頭（`⌄`，同 SVG 風格線條）
- 點擊後：整個工具列 `#toolbar` 隱藏，改顯示**底部中央小圓按鈕**（`#tb-expand`，直徑 44px，☰ 圖示）
- 點擊小圓按鈕：工具列展開回完整狀態，小圓按鈕隱藏
- 收合/展開狀態**不記憶**：每次重新開啟網頁預設為展開

### 2. iOS 全螢幕＝沉浸模式

- 偵測 iOS：`/iP(hone|ad|od)/.test(navigator.userAgent)` 且 `!window.MSStream`
- iOS 上 `#tb-fullscreen` 按鈕行為改為**切換收合**（與 `#tb-collapse` 相同），不呼叫 Fullscreen API
- 非 iOS（桌面/Android）維持現行真全螢幕行為

### 3. 真全螢幕自動收合（桌面/Android）

- 擴充現有 `fullscreenchange` 監聽（js/app.js:687）：
  - 進入全螢幕 → 自動收合工具列
  - 退出全螢幕 → 自動展開工具列
- 與現有 `updateFsIcon` 圖示切換並存

### 4. 邊界情況

- 收合狀態下所有快捷鍵（1/2/3/4/R/F/↑↓）仍正常運作
- 收合狀態下，工具列拖動/釘選（tb-locked）不運作（工具列不可見，無從操作）
- 收合狀態下記憶位置不變，展開後回到原本拖動位置
- 全螢幕期間使用者手動展開工具列 → 下次 fullscreenchange 仍以事件為準（進入即收合、退出即展開），不與使用者手動操作衝突

## 三、技術實作重點

- `index.html`：
  - `#tb-wrap` 內新增 `#tb-collapse` 按鈕（位於 `#tb-pin` 之後）
  - `#tb-wrap` 內新增小圓按鈕 `#tb-expand`（☰ 圖示，預設隱藏）
  - 版本號 `?v=20260817b` → 更新為 `?v=20260817c`
- `css/style.css`：
  - `#tb-collapse` 沿用 `.toolbtn` 樣式
  - `#tb-expand`：底部中央固定、44px 圓形、z-index 同工具列
  - 收合狀態樣式：`#tb-wrap.collapsed #toolbar { display: none; }`；`#tb-wrap.collapsed #tb-expand { display: flex; }`
- `js/app.js`：
  - `isIOS()` 工具函式
  - `setToolbarCollapsed(collapsed)`：切換 `#tb-wrap.collapsed` class
  - `#tb-collapse` click → `setToolbarCollapsed(true)`
  - `#tb-expand` click → `setToolbarCollapsed(false)`
  - iOS 偵測下 `toggleFullscreen` 改為呼叫 `setToolbarCollapsed(toggle)`
  - `fullscreenchange` 內：桌面/Android 進入全螢幕 `setToolbarCollapsed(true)`、退出 `setToolbarCollapsed(false)`

## 四、驗證

- `node --check js\app.js` 通過
- 本機瀏覽器手動測試：
  - 桌面：點收合 → 出現小圓鈕 → 點展開
  - 桌面：F 進入全螢幕 → 工具列自動收合 → 退出 → 自動展開
  - Android：同桌面
  - iPhone Safari：點全螢幕按鈕 → 等同收合（不會跳轉/無反應）
  - 收合狀態下快捷鍵仍正常
