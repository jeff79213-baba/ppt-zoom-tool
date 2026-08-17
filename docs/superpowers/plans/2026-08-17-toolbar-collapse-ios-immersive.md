# 工具列收合 ＋ iOS 沉浸模式 實施計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增工具列收合/展開（小圓按鈕細標），並讓 iOS 上「全螢幕」改為沉浸模式（收合工具列），桌面/Android 真全螢幕自動收合工具列。

**Architecture:** 單頁式 vanilla JS。收合狀態由 `#tb-wrap` 上的 `.collapsed` class 驅動 CSS（隱藏 `#toolbar`、顯示底部小圓鈕 `#tb-expand`）。JS 提供 `isIOS()` 偵測與 `setToolbarCollapsed(bool)` 切換，並在 `fullscreenchange` 中整合自動收合。

**Tech Stack:** 純 HTML / CSS / Vanilla JS（無框架、無測試框架）。驗證方式：`node --check js\app.js` ＋ 本機瀏覽器手動測試。

## Global Constraints

- 版本號：`js/app.js` 的 `?v=` 由 `20260817b` 更新為 `20260817c`
- localStorage 前綴：本功能不新增 localStorage key（收合狀態不記憶）
- 收合狀態每次開啟網頁預設為展開
- 所有 UI 文字為繁體中文
- 工具列所有按鈕沿用現有 `.toolbtn` 樣式（40×40、透明背景、hover 亮起）
- 不得引入外部套件

---

### Task 1: 工具列新增收合按鈕與小圓展開按鈕（HTML）

**Files:**
- Modify: `index.html:171-174`（`#tb-pin` 之後新增 `#tb-collapse`）
- Modify: `index.html:174`（`</nav>` 之後、`</aside>` 之前新增 `#tb-expand`）
- Modify: `index.html:179`（版本號）

**Interfaces:**
- Produces: `#tb-collapse` 按鈕（id、class `toolbtn`）、`#tb-expand` 按鈕（id）、版本號 `?v=20260817c`。Task 3 依賴這兩個 id。

- [ ] **Step 1: 在 `#tb-pin` 之後新增收合按鈕**

在 `index.html` 的 `#tb-pin` 按鈕（`</button>` 結尾，第 173 行）之後、`</nav>`（第 174 行）之前插入：

```html
    <button id="tb-collapse" type="button" class="toolbtn" title="收起工具列">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18M3 12h18M3 19h18M12 9v7"/></svg>
    </button>
```

- [ ] **Step 2: 在 `</nav>` 之後新增小圓展開按鈕**

`</nav>`（第 174 行）與 `</aside>`（第 175 行）之間插入：

```html
  <button id="tb-expand" type="button" title="展開工具列" hidden>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  </button>
```

注意：保留 `hidden` 屬性（CSS 會以 `.collapsed` 覆寫顯示，`hidden` 是初始預設狀態）。

- [ ] **Step 3: 更新版本號**

將 `index.html` 第 179 行：

```html
<script src="js/app.js?v=20260817b"></script>
```

改為：

```html
<script src="js/app.js?v=20260817c"></script>
```

- [ ] **Step 4: 驗證 HTML**

以 Read 重新讀取 `index.html:160-181`，確認：
- `#tb-collapse` 在 `#tb-pin` 與 `</nav>` 之間
- `#tb-expand` 在 `</nav>` 與 `</aside>` 之間且帶 `hidden`
- 版本號為 `?v=20260817c`
- 元素無重複 id

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: 工具列新增收合按鈕與小圓展開按鈕（HTML）"
```

---

### Task 2: 收合樣式（CSS）

**Files:**
- Modify: `css/style.css`（新增區塊，置於檔案尾端 media query 之後）

**Interfaces:**
- Consumes: `#tb-wrap`（已存在，Task 1 不產生新需求）、`#tb-collapse`、`#tb-expand`
- Produces: `.collapsed` class 樣式、`#tb-expand` 固定圓鈕樣式。Task 3 依賴 `.collapsed` 於 `#tb-wrap` 上的行為。

- [ ] **Step 1: 新增收合樣式**

在 `css/style.css` 檔案最尾端新增：

```css
/* ---------- 工具列收合 ---------- */
#tb-collapse { color: #7f8896; }

#tb-expand {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: 44px;
  height: 44px;
  display: none;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(20,23,28,.92);
  color: #cdd4dd;
  cursor: pointer;
  z-index: 40;
  box-shadow: 0 -2px 14px rgba(0,0,0,.4);
  touch-action: none;
}
#tb-expand:hover { color: #fff; }

#tb-wrap.collapsed #toolbar { display: none; }
#tb-wrap.collapsed #tb-expand { display: flex; }
```

- [ ] **Step 2: 驗證 CSS**

以 Read 重新讀取 `css/style.css` 尾端，確認新增區塊完整、`#tb-expand` 預設 `display: none`、`.collapsed` 規則存在。

注意：`#tb-expand` 帶 `hidden` 屬性時瀏覽器預設 `display: none`，與 CSS `display: none` 一致；`.collapsed` 的 `display: flex` 需要能覆蓋 `hidden`——由於 `.collapsed #tb-expand` 選擇器 specificity 高於 `[hidden]` 的 UA style，`display: flex` 會生效。不需要改 JS 移除 `hidden`。

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: 工具列收合/展開樣式"
```

---

### Task 3: 收合邏輯與 iOS 沉浸模式（JS）

**Files:**
- Modify: `js/app.js:667-687`（全螢幕區塊）
- Modify: `js/app.js:758-771`（快捷鍵區塊）
- Modify: `js/app.js:16-20`（元素宣告區，新增兩行）

**Interfaces:**
- Consumes: `#tb-collapse`、`#tb-expand`（Task 1）、`.collapsed` class（Task 2）、`$tbWrap`（已存在）
- Produces: `isIOS()`（回傳 boolean）、`setToolbarCollapsed(bool)`（切換 `#tb-wrap` 的 `.collapsed` class）

- [ ] **Step 1: 新增元素宣告**

在 `js/app.js` 第 19 行（`const $penOpts = ...`）之後、第 20 行（`const $pgFile = ...`）之前新增：

```js
  const $tbCollapse = document.getElementById("tb-collapse");
  const $tbExpand   = document.getElementById("tb-expand");
```

- [ ] **Step 2: 新增 isIOS 與 setToolbarCollapsed 函式**

在全螢幕區塊（第 667 行 `// ---------- 全螢幕 ----------`）之前插入：

```js
  // ---------- 工具列收合 ----------
  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
  }
  function setToolbarCollapsed(collapsed) {
    $tbWrap.classList.toggle("collapsed", collapsed);
  }
  $tbCollapse.addEventListener("click", () => setToolbarCollapsed(true));
  $tbExpand.addEventListener("click", () => setToolbarCollapsed(false));
```

- [ ] **Step 3: 修改 toggleFullscreen 支援 iOS 沉浸模式**

將第 668-678 行：

```js
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      return;
    }
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try { req.call(el); } catch (_) {}
    }
  }
```

改為：

```js
  function toggleFullscreen() {
    if (isIOS()) {
      $tbWrap.classList.toggle("collapsed");
      return;
    }
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      return;
    }
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try { req.call(el); } catch (_) {}
    }
  }
```

- [ ] **Step 4: fullscreenchange 自動收合/展開**

將第 687 行：

```js
  document.addEventListener("fullscreenchange", updateFsIcon);
```

改為：

```js
  document.addEventListener("fullscreenchange", () => {
    updateFsIcon();
    if (!isIOS()) setToolbarCollapsed(!!document.fullscreenElement);
  });
```

- [ ] **Step 5: 語法驗證**

Run: `node --check js\app.js`
Expected: 無輸出、exit code 0

- [ ] **Step 6: 邏輯驗證**

以 Grep 確認：
- `isIOS` 被呼叫於 `toggleFullscreen` 與 `fullscreenchange` handler
- `setToolbarCollapsed` 被呼叫於 4 處（collapse click、expand click、toggleFullscreen iOS 分支、fullscreenchange）
- `$tbCollapse`、`$tbExpand` 已宣告並監聽 click

- [ ] **Step 7: Commit**

```bash
git add js/app.js
git commit -m "feat: 工具列收合邏輯 + iOS 沉浸模式 + 全螢幕自動收合"
```

---

### Task 4: 本機手動驗證

**Files:**
- 無（僅驗證）

**Interfaces:**
- Consumes: Task 1-3 成果

- [ ] **Step 1: 本機啟動測試**

在本專案目錄啟動靜態伺服器（如 `python -m http.server 8000` 或沿用既有 localhost 伺服器），開啟 http://localhost:8000。

驗證項目（桌面 Chrome）：
1. 工具列最右側出現 `#tb-collapse`（下收合箭頭）
2. 點 `#tb-collapse` → 工具列消失，底部中央出現 44px 圓鈕
3. 點圓鈕 → 工具列恢復，圓鈕消失
4. 按 F → 進入全螢幕，工具列自動收合；按 F → 退出，工具列自動展開
5. 收合狀態下按 1/2/3/4/R/↑↓ 快捷鍵正常
6. 重新整理網頁 → 工具列預設展開（不記憶收合）

- [ ] **Step 2: 手機驗證（實機或 DevTools 模擬）**

DevTools 切到 iPhone 模擬（含 touch），驗證：
1. 點 `#tb-collapse` 收合 → 圓鈕出現
2. 點全螢幕按鈕 → 行為等同收合（工具列收合，圓鈕出現），無 TypeError
3. 點圓鈕展開

若無實機可測，此步驟標記為「待使用者實機確認」，不阻擋交付。

- [ ] **Step 3: 記錄驗證結果**

將結果記入 `.superpowers/sdd/` 進度檔（如存在）或回報於提交訊息摘要。

- [ ] **Step 4: 版本號確認**

確認 `index.html` 版本號 `?v=20260817c` 已隨 Task 1 commit。若 Task 1 之後有進一步 JS 修改，更新為 `?v=20260817c` 不變（本計畫僅一次版本推進）。

- [ ] **Step 5: 最終 commit（如驗證中產生修正）**

若驗證發現問題，直接修正並 commit；若無，則無需 commit。

---

## Self-Review

**Spec 覆蓋率：**
- 工具列收合按鈕 → Task 1（HTML）+ Task 2（CSS）+ Task 3（JS）
- 收合後小圓按鈕 → Task 1 `#tb-expand` + Task 2 樣式
- 不記憶狀態 → Global Constraints（不使用 localStorage）+ Task 4 驗證項目 6
- iOS 全螢幕＝沉浸模式 → Task 3 Step 3（`isIOS()` 分支）
- 真全螢幕自動收合 → Task 3 Step 4（fullscreenchange）
- 收合狀態下快捷鍵正常 → Task 4 驗證項目 5
- 版本號 → Task 1 Step 3（`20260817c`）

**Placeholder 掃描：** 無 TBD/TODO，每步含實際程式碼與驗證指令。

**型別/名稱一致性：** `isIOS()`、`setToolbarCollapsed(bool)` 在 Task 3 定義與使用一致；`$tbCollapse`、`$tbExpand` 宣告後即使用；`#tb-collapse`、`#tb-expand` id 在 Task 1 與 Task 3 一致。
