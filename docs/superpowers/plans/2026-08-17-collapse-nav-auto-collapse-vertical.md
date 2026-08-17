# 收合換頁箭頭 ＋ 自動收合 ＋ 側邊直式工具列 實施計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將收合細標改為三顆一排（←☰→）換頁；選工具後自動收合（鎖定＝常駐＋固定）；工具列拖到左右側轉直式，小圓鈕跟隨位置；退出全螢幕維持收合。

**Architecture:** 單頁 vanilla JS。收合狀態由 `#tb-wrap.collapsed` class 驅動；停靠位置由 `#toolbar` 上的 `edge-left`/`edge-right` class 驅動直式排列與 `#tb-mini` 停靠。JS 提供 `setToolbarCollapsed()`、自動收合（`setTool` 內判斷 `state.tbLocked`）、拖動結束邊緣偵測、`fullscreenchange` 調整。

**Tech Stack:** 純 HTML / CSS / Vanilla JS（無框架、無測試框架）。驗證方式：`node --check js\app.js` ＋ 本機瀏覽器手動測試。

## Global Constraints

- 版本號：`index.html` 的 `?v=` 由 `20260817c` 更新為 `20260817d`
- localStorage 既有 key：`pptzoom_toolbarPos`（位置）、`pptzoom_toolbarOpacity`（透明度）沿用，不改格式
- UI 文字為繁體中文
- 不得引入外部套件
- 不新增 localStorage key（收合狀態、edge 狀態皆不記憶）

---

### Task 1: 小圓鈕改為三顆一排（HTML＋CSS）

**Files:**
- Modify: `index.html:178-180`（`#tb-expand` 包入 `#tb-mini`，新增左右箭頭）
- Modify: `css/style.css:377-404`（收合區塊）
- Modify: `index.html:185`（版本號）

**Interfaces:**
- Produces: `#tb-mini` 容器（含 `#tb-expand-prev`、`#tb-expand`、`#tb-expand-next` 三顆）、CSS 三種停靠位置。Task 3/4 依賴這些 id 與 class。

- [ ] **Step 1: 重組 HTML 小圓鈕**

將 `index.html` 第 178-180 行：

```html
  <button id="tb-expand" type="button" title="展開工具列">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  </button>
```

改為：

```html
  <div id="tb-mini">
    <button id="tb-expand-prev" type="button" class="tb-mini-btn" title="上一頁">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button id="tb-expand" type="button" class="tb-mini-btn" title="展開工具列">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <button id="tb-expand-next" type="button" class="tb-mini-btn" title="下一頁">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </div>
```

- [ ] **Step 2: 重寫收合 CSS 區塊**

將 `css/style.css` 第 377-404 行（`/* ---------- 工具列收合 ---------- */` 到檔尾）改為：

```css
/* ---------- 工具列收合 ---------- */
#tb-collapse { color: #7f8896; }

#tb-mini {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: none;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(20,23,28,.92);
  border-radius: 12px;
  box-shadow: 0 -2px 14px rgba(0,0,0,.4);
  z-index: 40;
  pointer-events: auto;
  touch-action: none;
}
.tb-mini-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #cdd4dd;
  cursor: pointer;
}
.tb-mini-btn:hover { color: #fff; background: rgba(255,255,255,.10); }

#tb-wrap.collapsed #toolbar,
#tb-wrap.collapsed #pen-panel { display: none; }
#tb-wrap.collapsed #tb-mini { display: flex; }
```

- [ ] **Step 3: 更新版本號**

`index.html:185`：`?v=20260817c` → `?v=20260817d`

- [ ] **Step 4: 驗證**

以 Read 重新讀取 `index.html:174-187` 與 `css/style.css` 尾端，確認：
- `#tb-mini` 含三顆 `.tb-mini-btn`，id 分別為 `tb-expand-prev`、`tb-expand`、`tb-expand-next`
- CSS `#tb-mini` 預設 `display: none`，`.collapsed #tb-mini` `display: flex`
- 版本號 `?v=20260817d`
- 舊 `#tb-expand` 單獨按鈕的 CSS 已移除（不再有獨立圓形樣式）

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: 收合細標改為三顆一排（← 上一頁 / ☰ 展開 / → 下一頁）"
```

---

### Task 2: 選工具自動收合 ＋ 鎖定＝常駐＋固定（JS）

**Files:**
- Modify: `js/app.js:443-458`（`setTool` 與工具鈕綁定）
- Modify: `js/app.js:709-714`（`$tbPin` 行為）
- Modify: `js/app.js:14-21`（元素宣告區，新增 `$tbMini` 等）

**Interfaces:**
- Consumes: `#tb-expand-prev`、`#tb-expand-next`（Task 1）、`state.tbLocked`（已存在）、`setToolbarCollapsed`（已存在）
- Produces: 自動收合行為（`setTool` 內）、`state.tbLocked` 語意擴充（常駐＋固定）

- [ ] **Step 1: 新增元素宣告**

`js/app.js` 元素宣告區（`const $tbExpand` 附近，第 16-20 行間）新增：

```js
  const $tbMini = document.getElementById("tb-mini");
  const $tbExpandPrev = document.getElementById("tb-expand-prev");
  const $tbExpandNext = document.getElementById("tb-expand-next");
```

- [ ] **Step 2: 左右箭頭換頁**

在 `$tbExpand.addEventListener("click", () => setToolbarCollapsed(false));`（第 677 行）之後新增：

```js
  $tbExpandPrev.addEventListener("click", () => { if (cur()) gotoPage(cur().page - 1); });
  $tbExpandNext.addEventListener("click", () => { if (cur()) gotoPage(cur().page + 1); });
```

- [ ] **Step 3: setTool 自動收合**

`setTool` 函式（第 444-455 行）在 `for (const [t, id] ...)` 迴圈之後新增一行（保持現有縮排）：

```js
    if (!state.tbLocked && !$tbWrap.classList.contains("collapsed")) setToolbarCollapsed(true);
```

注意：此為 `setTool` 結尾，與既有 `$penOpts.hidden`、active class 迴圈並存。快捷鍵 1/2/3/4 也呼叫 `setTool`，但因 `!$tbWrap.classList.contains("collapsed")` 判斷，收合狀態下快捷鍵不會誤觸發。

- [ ] **Step 4: 鎖定語意註解（不改程式碼）**

`$tbPin` 現有處理（第 710-714 行）已達成「tb-locked 禁止拖動＋pinned class」。Task 3 會讓拖動在鎖定時失效（已存在 `if (state.tbLocked) return;` 於 pointerdown）。本任務不修改 `$tbPin` 程式碼，僅確認 `state.tbLocked` 語意與 spec 一致。

- [ ] **Step 5: 驗證**

Run: `node --check js\app.js`（無輸出、exit 0）
以 Grep 確認：`$tbExpandPrev`、`$tbExpandNext` 宣告並監聽；`setTool` 內有自動收合一行；`$tbMini` 宣告存在。

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: 收合細標左右箭頭換頁 + 選工具自動收合"
```

---

### Task 3: 側邊直式工具列 ＋ 小圓鈕跟隨位置（CSS＋JS）

**Files:**
- Modify: `css/style.css`（收合區塊後新增 edge 樣式）
- Modify: `js/app.js:716-759`（`initToolbarPos` 拖動邏輯）
- Modify: `js/app.js:673-677`（`setToolbarCollapsed` 依 edge 設 mini 位置——CSS 處理，不需 JS）

**Interfaces:**
- Consumes: `#tb-mini`、`#toolbar`（Task 1）、`state.tbLocked`
- Produces: `edge-left`/`edge-right` class 於 `#toolbar`、`#tb-mini` 側邊停靠 CSS

- [ ] **Step 1: 新增 edge CSS**

在 `css/style.css` 檔尾（`.collapsed #tb-mini` 之後）新增：

```css
/* ---------- 側邊直式工具列 ---------- */
#toolbar.edge-left,
#toolbar.edge-right {
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}
#toolbar.edge-left .tb-sep,
#toolbar.edge-right .tb-sep { width: 30px; height: 1px; margin: 4px 0; }
#toolbar.edge-left .pen-options,
#toolbar.edge-right .pen-options { display: none; }

#toolbar.edge-left { left: 8px; bottom: auto; top: 50%; transform: translateY(-50%); }
#toolbar.edge-right { right: 8px; bottom: auto; top: 50%; transform: translateY(-50%); }

#tb-wrap.edge-left #tb-mini { left: 8px; right: auto; top: 50%; bottom: auto; transform: translateY(-50%); }
#tb-wrap.edge-right #tb-mini { left: auto; right: 8px; top: 50%; bottom: auto; transform: translateY(-50%); }
```

注意：`#tb-mini` 的 edge 停靠需要 `#tb-wrap` 也有 edge class。為簡化，讓 JS 同時加 class 到 `#tb-wrap` 與 `#toolbar`（Step 3）。

- [ ] **Step 2: 拖動結束邊緣偵測**

在 `js/app.js` 的 `initToolbarPos` 內，`endDrag` 函式（第 749-756 行）中，`localStorage.setItem` 之前新增：

```js
      const vw = window.innerWidth;
      const nearLeft = r.left <= 8;
      const nearRight = r.left + r.width >= vw - 8;
      $toolbar.classList.toggle("edge-left", nearLeft && !nearRight);
      $toolbar.classList.toggle("edge-right", nearRight && !nearLeft);
      $tbWrap.classList.toggle("edge-left", nearLeft && !nearRight);
      $tbWrap.classList.toggle("edge-right", nearRight && !nearLeft);
```

且（重要）邊緣停靠時 position 由 CSS class 控制，不應存 localStorage 的 xy；改為：若 edge 生效則不寫 pos：

```js
      if (!nearLeft && !nearRight) {
        try { localStorage.setItem("pptzoom_toolbarPos", JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) })); } catch (_) {}
      }
```

- [ ] **Step 3: 拖動移動時 clamp 仍生效**

`pointermove`（第 739-748 行）維持現有 clamp 不變。拖動中 edge class 不會即時切換（僅鬆手時判斷），符合直覺。

- [ ] **Step 4: 驗證**

Run: `node --check js\app.js`
以 Read 確認：`endDrag` 含 edge 判斷；CSS 含 edge-left/right 樣式；`#tb-mini` 側邊停靠規則存在。

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/app.js
git commit -m "feat: 工具列拖到左右側轉直式，小圓鈕跟隨停靠"
```

---

### Task 4: 退出全螢幕維持收合 ＋ 直式筆選項浮動（JS）

**Files:**
- Modify: `js/app.js:704-707`（`fullscreenchange`）
- Modify: `css/style.css`（edge 筆選項改浮動面板）

**Interfaces:**
- Consumes: `setToolbarCollapsed`、edge class（Task 3）
- Produces: 退出全螢幕維持收合；直式時 `#pen-panel` 顯示

- [ ] **Step 1: fullscreenchange 退出維持收合**

將 `js/app.js` 第 704-707 行：

```js
  document.addEventListener("fullscreenchange", () => {
    updateFsIcon();
    if (!isIOS()) setToolbarCollapsed(!!document.fullscreenElement);
  });
```

改為：

```js
  document.addEventListener("fullscreenchange", () => {
    updateFsIcon();
    if (!isIOS() && document.fullscreenElement) setToolbarCollapsed(true);
  });
```

即：進入全螢幕收合；退出時不動作（維持現狀，小圓鈕留著）。

- [ ] **Step 2: 直式時筆選項改浮動面板**

CSS 已有 `#toolbar.edge-left .pen-options, #toolbar.edge-right .pen-options { display: none; }`（Task 3）。需補：直式時 `#pen-panel` 應顯示（非收合狀態）。

在 Task 3 新增的 CSS 之後補：

```css
#toolbar.edge-left #pen-panel,
#toolbar.edge-right #pen-panel {
  display: flex;
  left: auto;
  bottom: auto;
  top: calc(100% + 8px);
  max-width: 220px;
}
```

注意：`#pen-panel` 預設被 `.collapsed #pen-panel { display: none; }` 隱藏，收合時不顯示。展開且直式時顯示。`#pen-panel` 為 `#tb-wrap` 內元素，edge class 加在 `#tb-wrap` 與 `#toolbar`，此選擇器用 `#toolbar.edge-* #pen-panel` 需 `#pen-panel` 在 `#toolbar` 內——但 `#pen-panel` 是 `#tb-wrap` 的直接子元素（與 `#toolbar` 同層）。改用 `#tb-wrap.edge-left #pen-panel`：

```css
#tb-wrap.edge-left #pen-panel,
#tb-wrap.edge-right #pen-panel {
  display: flex;
  left: 14px;
  bottom: auto;
  top: calc(50% + 70px);
  max-width: 220px;
}
```

- [ ] **Step 3: 驗證**

Run: `node --check js\app.js`
以 Read 確認：`fullscreenchange` 僅進入時收合；CSS 含 `#tb-wrap.edge-* #pen-panel` 顯示規則。

- [ ] **Step 4: Commit**

```bash
git add js/app.js css/style.css
git commit -m "feat: 退出全螢幕維持收合 + 直式筆選項浮動面板"
```

---

### Task 5: 本機手動驗證

**Files:**
- 無（僅驗證）

**Interfaces:**
- Consumes: Task 1-4 成果

- [ ] **Step 1: 本機啟動測試**

在專案目錄啟動靜態伺服器，開啟 http://localhost:8000。

桌面 Chrome 驗證：
1. 點收合 → 出現三顆 `← ☰ →`；`→` 下一頁、`←` 上一頁；☰ 展開
2. 展開 → 選「筆」→ 工具列自動收合（未鎖定）
3. 展開 → 點鎖定（tb-pin）→ 選工具不收合；嘗試拖動無效
4. 拖工具列到左邊緣鬆手 → 轉直式、貼左；到右邊緣 → 貼右直式；回中間 → 橫式
5. 直式收合 → 小圓鈕停左/右側
6. F 進全螢幕 → 自動收合；esc 退出 → 維持收合（小圓鈕留著）
7. 快捷鍵 1/2/3/4 在收合狀態不展開工具列
8. 直式時選筆 → 浮動面板出現（若可測）

- [ ] **Step 2: 手機驗證（實機或 DevTools 模擬）**

DevTools iPhone 模擬：收合 → 三顆出現；點 → 換頁；☰ 展開選工具 → 自動收合。
若無實機，標記「待使用者實機確認」，不阻擋。

- [ ] **Step 3: 記錄結果**

結果記入 `.superpowers/sdd/` 進度檔。若發現缺陷，修正並 commit。

- [ ] **Step 4: 最終 commit（如修正）**

若有修正，commit 並更新版本號為 `?v=20260817d`（維持不變，僅一次推進）。

---

## Self-Review

**Spec 覆蓋率：**
- 三顆一排換頁箭頭 → Task 1（HTML＋CSS）＋ Task 2 Step 2（JS 換頁）
- 選工具自動收合 → Task 2 Step 3（`setTool` 內）
- 鎖定＝常駐＋固定 → Task 2 Step 4（tbLocked 已提供）；Task 3 拖動受 tbLocked 阻擋
- 拖到邊緣直式 → Task 3（edge class）
- 小圓鈕跟隨位置 → Task 3 Step 1 CSS + Step 2 JS（edge 加到 tb-wrap）
- 退出全螢幕維持收合 → Task 4 Step 1
- 直式筆選項浮動 → Task 4 Step 2
- 快捷鍵不觸發自動收合 → Task 2 Step 3（`!collapsed` 判斷）
- 版本號 → Task 1 Step 3（`20260817d`）

**Placeholder 掃描：** 每步含完整程式碼與驗證指令，無 TBD。

**型別/名稱一致性：** `#tb-mini`、`#tb-expand-prev`、`#tb-expand-next`、`edge-left`/`edge-right`、`state.tbLocked` 各 Task 間一致。
