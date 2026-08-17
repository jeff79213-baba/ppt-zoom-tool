# 全螢幕＋可拖動工具列＋透明度＋垃圾桶清空 實施計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增全螢幕按鈕、工具列改常駐＋可拖動＋透明度調整、垃圾桶一次清空全部。

**Architecture:** 純前端 HTML/CSS/JS（無框架、無測試框架）。工具列由「底部置中＋hover 浮現」改為「常駐＋☰ 手把拖動」，位置/透明度存 localStorage。全螢幕用 HTML5 Fullscreen API。放大鏡長按選取機制移除，改由垃圾桶一次清空。

**Tech Stack:** HTML5、CSS、原生 JS、pdf.js（不改動）。

## Global Constraints

- 檔案：只改 `index.html`、`css/style.css`、`js/app.js`
- localStorage key 前綴 `pptzoom_`（`pptzoom_toolbarPos`、`pptzoom_toolbarOpacity`）
- 不使用任何測試框架（專案無測試基礎設施）；驗證用 `node --check`＋本機瀏覽器手動測試
- 桌面版與手機版（`max-width:860px`）都要可拖動工具列
- 每次任務完成後 commit

---

### Task 1: 全螢幕按鈕＋快捷鍵 F

**Files:**
- Modify: `index.html`（工具列內新增按鈕）
- Modify: `css/style.css`（全螢幕按鈕樣式）
- Modify: `js/app.js`（切換邏輯＋快捷鍵）

**Interfaces:**
- Produces: `#tb-fullscreen` 按鈕（`toolbtn` class）；JS 函數 `toggleFullscreen()`；`fullscreenchange` 監聽

- [ ] **Step 1: 在工具列新增全螢幕按鈕**

在 `index.html` 的 `#tb-reset` 按鈕（約 line 156）與 `#tb-delmag`（line 158）之間插入：

```html
<button id="tb-fullscreen" type="button" class="toolbtn" title="全螢幕  快捷鍵 F">
  <svg id="fs-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
</button>
```

- [ ] **Step 2: 加入全螢幕按鈕 hover 樣式**

`css/style.css` 不需新增選擇器（`#tb-fullscreen` 已有 `.toolbtn` 樣式）。跳到 Step 3。

- [ ] **Step 3: 實作切換邏輯**

在 `js/app.js` 的「---------- 工具列釘選 ----------」區塊（約 line 679-680）之前插入：

```js
// ---------- 全螢幕 ----------
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}
document.getElementById("tb-fullscreen").addEventListener("click", toggleFullscreen);
function updateFsIcon() {
  const icon = document.getElementById("fs-icon");
  const inFs = !!document.fullscreenElement;
  icon.innerHTML = inFs
    ? '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>'
    : '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>';
}
document.addEventListener("fullscreenchange", updateFsIcon);
```

- [ ] **Step 4: 快捷鍵 F**

在 `js/app.js` 的 `window.addEventListener("keydown", ...)`（約 line 705-715）內，**第一行 `const doc = cur();` 之後、`if (!doc) return;` 之前**插入：

```js
if (e.key === "f" || e.key === "F") { toggleFullscreen(); return; }
```

註：必須放在 `if (!doc) return;` 之前，讓未開檔也能進全螢幕。

- [ ] **Step 5: 驗證**

Run: `node --check js/app.js`
Expected: 無錯誤輸出

本機 `http://localhost:8000` 開啟：工具列出現全螢幕圖示；點擊或按 F 進入/退出全螢幕；圖示隨狀態切換。

- [ ] **Step 6: Commit**

```bash
git add index.html js/app.js
git commit -m "新增全螢幕按鈕與快捷鍵 F"
```

---

### Task 2: 工具列改常駐＋☰ 拖動手把＋位置記憶

**Files:**
- Modify: `index.html`（新增拖動手把；移除 `#tb-edge`）
- Modify: `css/style.css`（定位改常駐；移除 hover 浮現機制）
- Modify: `js/app.js`（拖動邏輯＋localStorage）

**Interfaces:**
- Consumes: `#tb-pin`（改為鎖定拖動）、`$tbWrap`、`$tbPin`
- Produces: `#tb-drag` 按鈕；`state.tbLocked`；localStorage `pptzoom_toolbarPos`（JSON `{x,y}`）

- [ ] **Step 1: HTML 加拖動手把、移除 tb-edge**

在 `index.html` 的 `<nav id="toolbar">`（約 line 64）內**最前面**（第一個 `.tb-group` 之前）插入：

```html
<button id="tb-drag" type="button" class="tb-drag" title="按住拖動工具列">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
</button>
```

並刪除 `<div id="tb-edge"></div>`（約 line 31）。

- [ ] **Step 2: CSS 改常駐定位、移除 hover 機制、加手把樣式**

將 `css/style.css` 中 `#tb-wrap`（line 72-77）、`#tb-edge`（line 79-84）、`#toolbar`（line 86-100）、`#tb-wrap:hover #toolbar`（line 102-106）整段替換為：

```css
/* ---------- 工具列（常駐、可拖動） ---------- */
#tb-wrap {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 64px;
  z-index: 40;
}

#toolbar {
  position: fixed;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(20,23,28,.92);
  backdrop-filter: blur(6px);
  border-radius: 14px;
  box-shadow: 0 -2px 14px rgba(0,0,0,.4);
  touch-action: none;
}
#toolbar.dragging { user-select: none; }

.tb-drag {
  width: 26px;
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #7f8896;
  cursor: grab;
  touch-action: none;
}
.tb-drag:hover { background: rgba(255,255,255,.10); color: #fff; }
#toolbar.tb-locked .tb-drag { cursor: default; color: #5a6270; }
```

- [ ] **Step 3: 手機版 CSS 改 fixed**

`css/style.css` 中手機 media query `@media (hover: none), (max-width: 860px)`（約 line 316）內，將 `#toolbar` 的 `position: static; width: 100%;` 改為 `position: fixed; left: 50%; width: max-content;`，並移除 `#tb-edge` 相關（已刪元素）：

```css
@media (hover: none), (max-width: 860px) {
  #tb-wrap { height: auto; }
  #tb-pin { display: none; }

  #toolbar {
    position: fixed;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    max-width: calc(100vw - 12px);
    flex-wrap: wrap;
    justify-content: center;
    border-radius: 12px;
  }
  .tb-sep { display: none; }
}
```

註：原 `#tb-edge { display: none; }`、`#toolbar { position: static; ... }`、`#tb-wrap:hover #toolbar` 等行一併移除。

- [ ] **Step 4: JS 實作拖動＋位置記憶**

在 `js/app.js` 的元素宣告區（約 line 14-15 `$tbWrap`、`$tbPin`）之後加入：

```js
const $tbDrag  = document.getElementById("tb-drag");
const $toolbar = document.getElementById("toolbar");
```

在 state 物件（約 line 45 之後）加入：

```js
state.tbLocked = false;
```

將「工具列釘選」區塊（約 line 679-680 `$tbPin.addEventListener(...)`）替換為：

```js
// ---------- 工具列釘選＝鎖定位置 / 拖動 ----------
$tbPin.addEventListener("click", () => {
  state.tbLocked = !state.tbLocked;
  $toolbar.classList.toggle("tb-locked", state.tbLocked);
  $tbWrap.classList.toggle("pinned", state.tbLocked);
});

(function initToolbarPos() {
  let pos = null;
  try { pos = JSON.parse(localStorage.getItem("pptzoom_toolbarPos")); } catch (_) {}
  if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
    $toolbar.style.left = pos.x + "px";
    $toolbar.style.top = pos.y + "px";
    $toolbar.style.transform = "none";
  }
  // 拖動
  let dragging = false, dx = 0, dy = 0;
  $tbDrag.addEventListener("pointerdown", (e) => {
    if (state.tbLocked) return;
    e.preventDefault();
    dragging = true;
    dx = e.clientX - $toolbar.getBoundingClientRect().left;
    dy = e.clientY - $toolbar.getBoundingClientRect().top;
    $toolbar.classList.add("dragging");
    $tbDrag.setPointerCapture(e.pointerId);
  });
  $tbDrag.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const x = e.clientX - dx;
    const y = e.clientY - dy;
    const tw = $toolbar.offsetWidth, th = $toolbar.offsetHeight;
    $toolbar.style.left = Math.max(4, Math.min(x, window.innerWidth - tw - 4)) + "px";
    $toolbar.style.top = Math.max(4, Math.min(y, window.innerHeight - th - 4)) + "px";
    $toolbar.style.bottom = "auto";
    $toolbar.style.transform = "none";
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    $toolbar.classList.remove("dragging");
    try { $tbDrag.releasePointerCapture(e.pointerId); } catch (_) {}
    const r = $toolbar.getBoundingClientRect();
    localStorage.setItem("pptzoom_toolbarPos", JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
  };
  $tbDrag.addEventListener("pointerup", endDrag);
  $tbDrag.addEventListener("pointercancel", endDrag);
})();
```

- [ ] **Step 5: 驗證**

Run: `node --check js/app.js`
Expected: 無錯誤輸出

本機瀏覽器：工具列常駐顯示（不再需要滑鼠移到底部浮現）；按住 ☰ 可拖到任意位置；重新整理後位置保持；釘選鈕點擊後 ☰ 失效（鎖定）、再點解除。

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "工具列常駐可拖動：☰ 手把、位置記憶、釘選改鎖定"
```

---

### Task 3: 工具列透明度滑桿

**Files:**
- Modify: `index.html`（工具列新增滑桿）
- Modify: `css/style.css`（滑桿樣式）
- Modify: `js/app.js`（調整邏輯＋localStorage）

**Interfaces:**
- Consumes: Task 2 的 `#toolbar`、`$toolbar`
- Produces: `#tb-opacity` range input；localStorage `pptzoom_toolbarOpacity`

- [ ] **Step 1: HTML 加滑桿**

在 `index.html` 中 `#tb-pin` 按鈕（約 line 165）之前插入：

```html
<label class="tb-opacity" title="工具列透明度">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z"/></svg>
  <input id="tb-opacity" type="range" min="0" max="100" value="100">
</label>
```

- [ ] **Step 2: CSS 滑桿樣式**

在 `css/style.css` 加入：

```css
.tb-opacity {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #7f8896;
  padding: 0 4px;
}
.tb-opacity input {
  width: 70px;
  accent-color: #4fc3f7;
}
@media (max-width: 860px) {
  .tb-opacity input { width: 48px; }
}
```

- [ ] **Step 3: JS 實作透明度**

在 `js/app.js` 的 Task 2 加入的 `const $toolbar = ...` 之後加入：

```js
const $tbOpacity = document.getElementById("tb-opacity");
```

在「工具列釘選＝鎖定位置 / 拖動」IIFE 之後加入：

```js
(function initToolbarOpacity() {
  let v = 100;
  const saved = parseInt(localStorage.getItem("pptzoom_toolbarOpacity"), 10);
  if (!isNaN(saved) && saved >= 0 && saved <= 100) v = saved;
  $tbOpacity.value = v;
  applyOpacity(v);
  function applyOpacity(val) {
    $toolbar.style.opacity = (val / 100).toFixed(2);
  }
  $tbOpacity.addEventListener("input", () => {
    applyOpacity(+$tbOpacity.value);
    localStorage.setItem("pptzoom_toolbarOpacity", $tbOpacity.value);
  });
})();
```

- [ ] **Step 4: 驗證**

Run: `node --check js/app.js`
Expected: 無錯誤輸出

本機瀏覽器：拖動滑桿工具列即時變透明；重新整理後保留；調到最低仍可拖動手把（工具列本身透明但可操作）。

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "工具列透明度滑桿，值記憶於 localStorage"
```

---

### Task 4: 垃圾桶＝清空全部＋移除放大鏡刪除機制

**Files:**
- Modify: `index.html`（移除 `#tb-delmag`）
- Modify: `css/style.css`（移除 delmag/selected/has-mag 樣式）
- Modify: `js/app.js`（tb-clear 清空全部；移除長按選取邏輯）

**Interfaces:**
- Consumes: `clearMagnifiers()`、`state.docs`、`$tbDelmag`
- Produces: `tb-clear` 一次清空筆跡＋放大鏡；移除 `#tb-delmag` 及長按選取

- [ ] **Step 1: 移除 HTML 的 tb-delmag 按鈕**

刪除 `index.html` 中 `#tb-delmag` 按鈕（約 line 158-160）。

- [ ] **Step 2: 移除 CSS delmag/selected/has-mag**

刪除 `css/style.css` 中：
- `.mag-window.selected { ... }`（line 210）
- `#tb-delmag { color: #ff8a80; }` 與 `#tb-delmag:hover { color: #fff; }`（line 211-212）
- 手機版 `#tb-wrap.has-mag .file-btn { display: none; }`（約 line 349）

- [ ] **Step 3: tb-clear 改清空全部**

`js/app.js` 中 `tb-clear` 監聽（約 line 502-505）替換為：

```js
document.getElementById("tb-clear").addEventListener("click", () => {
  const doc = cur();
  if (!doc) return;
  doc.strokes = [];
  clearMagnifiers();
  renderAll();
});
```

- [ ] **Step 4: 移除長按選取邏輯**

`js/app.js` 中「放大鏡視窗選取 / 刪除」區塊（約 line 682-702，含 `selectedMag`、`selectMag`、`removeMag`、`$tbDelmag` listener）整段刪除。

同時在 `createMagnifier` 內（約 line 603-643 的拖動/長按監聽）移除長按相關：
- `el.addEventListener("pointerdown", ...)` 內的 `clearTimeout(pressTimer); pressX/pressY/pressTimer/setTimeout` 整段與 `pressTimer = null`（保留 `dragging`、`dx`、`dy`、`setPointerCapture`）
- `el.addEventListener("pointermove", ...)` 內的 pressTimer 判斷區塊（保留 `if (!dragging) return;` 之後）
- `el.addEventListener("pointerup"` 與 `pointercancel`）內的 `clearTimeout(pressTimer); pressTimer = null;`

替換後的 `createMagnifier` 拖動區段（完整替換 line 603-643）：

```js
    // 拖動（長按選取機制已移除）
    let dragging = false, dx = 0, dy = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.target === close || e.target === grip) return;
      dragging = true;
      dx = e.clientX - left;
      dy = e.clientY - top;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      left = e.clientX - dx;
      top = e.clientY - dy;
      left = Math.max(0, Math.min(left, $viewer.clientWidth - winW));
      top = Math.max(0, Math.min(top, $viewer.clientHeight - winH));
      el.style.left = left + "px";
      el.style.top = top + "px";
    });
    el.addEventListener("pointerup", () => { dragging = false; });
    el.addEventListener("pointercancel", () => { dragging = false; });
```

- [ ] **Step 5: 移除 JS 中 $tbDelmag 宣告**

`js/app.js` 元素宣告區的 `const $tbDelmag = document.getElementById("tb-delmag");`（約 line 18）刪除。

- [ ] **Step 6: 驗證**

Run: `node --check js/app.js`
Expected: 無錯誤輸出

本機瀏覽器：
1. 畫幾筆＋建立放大鏡視窗 → 按垃圾桶 → 筆跡與放大鏡全部清空
2. 放大鏡視窗仍有右上角 × 可個別關閉
3. 長按放大鏡不再出現選取框與刪除鈕

- [ ] **Step 7: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "垃圾桶一次清空筆跡與放大鏡；移除長按選取刪除機制"
```

---

### Task 5: 版本號更新與完整驗證

**Files:**
- Modify: `index.html`（CSS/JS 版本號）

- [ ] **Step 1: 更新版本號**

`index.html` line 7：`css/style.css?v=20260816f` → `css/style.css?v=20260817b`
line 173：`js/app.js?v=20260816f` → `js/app.js?v=20260817b`

- [ ] **Step 2: 完整驗證**

Run: `node --check js/app.js`
Expected: 無錯誤輸出

本機 `http://localhost:8000` 完整測試清單：
- [ ] 全螢幕按鈕／F 鍵進入退出，圖示切換
- [ ] 工具列常駐、☰ 可拖動、位置重新整理後保持
- [ ] 釘選鈕鎖定拖動
- [ ] 透明度滑桿即時生效、重新整理後保持
- [ ] 垃圾桶一次清空筆跡＋放大鏡
- [ ] 手機窄視窗下工具列可拖動、筆選項浮動面板正常

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "版本號更新為 20260817b"
```
