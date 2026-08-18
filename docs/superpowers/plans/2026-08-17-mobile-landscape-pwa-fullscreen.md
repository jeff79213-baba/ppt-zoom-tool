# 實施計畫：手機橫向收合 + PWA + 全螢幕工具列簡化

日期：2026-08-17
設計規格：`docs/superpowers/specs/2026-08-17-mobile-landscape-pwa-fullscreen-design.md`

---

## Task 1：建立 PWA 基礎檔案
**目標**：新增 manifest.json、sw.js、icon placeholder、index.html meta tags

**變更檔案**：
- `manifest.json`（新）
- `sw.js`（新）
- `icon-192.png`（新，placeholder）
- `icon-512.png`（新，placeholder）
- `index.html`：新增 manifest link + apple meta tags + service worker registration

**驗證**：
- `node --check` 無語法錯誤
- `manifest.json` 結構正確
- 瀏覽器 DevTools → Application → Manifest 載入成功
- Service Worker 註冊成功（DevTools → Application → Service Workers）

---

## Task 2：PWA 提示橫幅
**目標**：手機瀏覽器首次開啟時顯示「加入主畫面」提示

**變更檔案**：
- `index.html`：新增橫幅 HTML（`#pwa-hint`）
- `css/style.css`：橫幅樣式（固定底部、z-index 高於工具列）
- `js/app.js`：載入時判斷是否顯示、關閉時記錄 localStorage

**驗證**：
- 手機瀏覽器（非 PWA）開啟 → 底部出現提示橫幅
- 點關閉 → 重新整理後不再出現
- PWA standalone 模式 → 不顯示橫幅

---

## Task 3：手機橫向自動收合
**目標**：手機橫向時工具列自動收合，直向時自動展開

**變更檔案**：
- `js/app.js`：新增 orientation 偵測邏輯（resize 事件 + debounce）
- `css/style.css`：無（已有的 `.collapsed` class 夠用）

**邏輯**：
1. 新增 `isMobileDevice()` 函數（判斷 `hover: none`）
2. 新增 `isFullscreen()` 函數（判斷 `fullscreenElement` 或 PWA standalone）
3. 監聽 `resize` 事件，debounce 150ms
4. 判斷 `innerWidth > innerHeight` 且 `isMobileDevice()` 且 `!isFullscreen()`
5. 符合 → `setToolbarCollapsed(true)`，不符 → `setToolbarCollapsed(false)`
6. 維持 `landscapeAuto` flag，手動操作時設為 false
7. 手動操作（收合/展開按鈕）時，`landscapeAuto = false`，跳過自動判斷

**驗證**：
- 手機直向 → 工具列展開
- 旋轉到橫向 → 工具列自動收合
- 旋回直向 → 工具列自動展開
- 手動收合後旋轉 → 維持收合（不強制展開）
- 桌面全螢幕 → 不套用橫向自動收合

---

## Task 4：全螢幕工具列簡化 + 版本號更新
**目標**：全螢幕時工具列僅限底部/上方，不要左右側邊停靠；更新版本號

**變更檔案**：
- `js/app.js`：拖動結束時，全螢幕模式跳過 edge 判斷
- `js/app.js`：橫向自動收合跳過全螢幕模式
- `index.html`：版本號 `?v=20260817e`
- `css/style.css`：版本號 `?v=20260817e`

**邏輯**：
1. `endDrag` 函數中，若 `isFullscreen()` 為 true，跳過 `edge-left`/`edge-right` class
2. orientation 偵測中，若 `isFullscreen()` 為 true，跳過自動收合
3. 版本號統一更新

**驗證**：
- 桌面 F 鍵全螢幕 → 拖動工具列到邊緣，不會變直式
- PWA 模式 → 拖動工具列到邊緣，不會變直式
- 手機橫向 + PWA → 工具列不自動收合
- 版本號在 HTML 和 JS 中一致

---

## Task 5（Final Review）：整合測試
**目標**：驗證所有功能交叉運作正常

**測試項目**：
1. PWA manifest 載入正常
2. Service Worker 註冊 + 離線快取
3. PWA hint 橫幅顯示/隱藏
4. 手機直向 → 工具列展開
5. 手機橫向 → 工具列收合
6. 手機直向（已手動收合）→ 維持收合
7. 桌面全螢幕 → 工具列排底部，拖動無 edge
8. PWA standalone + 橫向 → 不自動收合
9. PWA hint 在 standalone 模式不出現
10. 版本號一致
