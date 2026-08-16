(function () {
  "use strict";

  // ---------- 元素 ----------
  const $viewer   = document.getElementById("viewer");
  const $pdfLayer = document.getElementById("pdf-layer");
  const $markLayer= document.getElementById("mark-layer");
  const $dropzone = document.getElementById("dropzone");
  const $file     = document.getElementById("file-input");
  const $btnOpen  = document.getElementById("btn-open");
  const $pgLabel  = document.getElementById("pg-label");
  const $pgPrev   = document.getElementById("pg-prev");
  const $pgNext   = document.getElementById("pg-next");
  const $tbWrap   = document.getElementById("tb-wrap");
  const $tbPin    = document.getElementById("tb-pin");
  const $penOpts  = document.getElementById("pen-panel");
  const $pgFile   = document.getElementById("pg-file");

  const ctxPdf  = $pdfLayer.getContext("2d");
  const ctxMark = $markLayer.getContext("2d");

  // 離屏渲染緩衝：PDF 以 renderScale 繪製到這裡
  const renderCanvas = document.createElement("canvas");
  const ctxRender = renderCanvas.getContext("2d");

  // ---------- 狀態 ----------
  const state = {
    docs: [],                     // [{ pdfDoc, numPages, page, strokes, fileName }]
    current: -1,                  // 目前文件索引
    pageW: 0, pageH: 0,          // 世界座標（PDF 點數）
    // 世界→螢幕： screen = world * scale + offset  （CSS px）
    scale: 1, ox: 0, oy: 0,
    renderScale: 0,              // 目前離屏 bitmap 的解析度（世界單位→px）
    tool: "glove",               // glove | zoom | mag | pen
    color: "#e53935",
    width: 4,                    // CSS px 線寬
    shape: "free",               // free | line | rect | circle
    magnifiers: [],              // 目前的放大鏡視窗 [{el}]
    pointer: null,               // 進行中的指標操作
    tempBox: null,               // 框選中的虛線矩形（世界座標）
  };

  function cur() { return state.docs[state.current]; }

  const MAX_SCALE = 64;
  const MIN_SCALE = 0.05;

  // ---------- 畫布尺寸 ----------
  function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = $viewer.clientWidth, h = $viewer.clientHeight;
    for (const c of [$pdfLayer, $markLayer]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    if (cur()) fitPage();
    renderAll();
  }
  window.addEventListener("resize", resizeCanvases);

  // ---------- transform 工具 ----------
  function fitPage() {
    const w = $viewer.clientWidth, h = $viewer.clientHeight;
    const s = Math.min(w / state.pageW, h / state.pageH);
    state.scale = s;
    state.ox = (w - state.pageW * s) / 2;
    state.oy = (h - state.pageH * s) / 2;
    renderAll();
    renderPdfIdle();
  }

  function resetView() {
    fitPage();
  }

  // ---------- PDF 渲染 ----------
  async function renderPdf() {
    const doc = cur();
    if (!doc) return;
    const page = await doc.pdfDoc.getPage(doc.page);
    const vp = page.getViewport({ scale: 1 });
    state.pageW = vp.width;
    state.pageH = vp.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const target = state.scale * dpr;
    const rs = Math.max(target, 0.2);
    // 限制緩衝大小避免爆記憶體
    const maxDim = 8192;
    const dimScale = Math.min(1, maxDim / Math.max(state.pageW * rs, state.pageH * rs));
    const finalRs = rs * dimScale;
    if (Math.abs(finalRs - state.renderScale) / Math.max(finalRs, 1e-6) > 0.02) {
      state.renderScale = finalRs;
      renderCanvas.width = Math.max(1, Math.ceil(state.pageW * finalRs));
      renderCanvas.height = Math.max(1, Math.ceil(state.pageH * finalRs));
      const vp2 = page.getViewport({ scale: finalRs });
      await page.render({ canvasContext: ctxRender, viewport: vp2 }).promise;
    }
    renderAll();
  }

  // 縮放變動後「慢速」重渲染（放開滑鼠後呼叫，避免拖曳卡頓）
  let renderTimer = null;
  function renderPdfIdle() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPdf, 120);
  }

  // ---------- 主繪製 ----------
  function renderAll() {
    renderPdfLayer();
    renderMarkLayer();
  }

  function renderPdfLayer() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = $pdfLayer.width, h = $pdfLayer.height;
    ctxPdf.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxPdf.clearRect(0, 0, w, h);

    // 背景（邊框留白區）
    ctxPdf.fillStyle = "#2b3037";
    ctxPdf.fillRect(0, 0, $viewer.clientWidth, $viewer.clientHeight);

    if (!cur() || renderCanvas.width < 2) return;

    const sx = state.ox, sy = state.oy;
    const sw = state.pageW * state.scale;
    const sh = state.pageH * state.scale;
    ctxPdf.drawImage(renderCanvas, sx, sy, sw, sh);

    // 頁面白底
    ctxPdf.strokeStyle = "rgba(0,0,0,.35)";
    ctxPdf.lineWidth = 1;
    ctxPdf.strokeRect(sx, sy, sw, sh);
  }

  function renderMarkLayer() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = $markLayer.width, h = $markLayer.height;
    ctxMark.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxMark.clearRect(0, 0, w, h);

    ctxMark.setTransform(dpr * state.scale, 0, 0, dpr * state.scale,
                         dpr * state.ox, dpr * state.oy);
    ctxMark.lineCap = "round";
    ctxMark.lineJoin = "round";

    const doc = cur();
    for (const s of (doc ? doc.strokes : [])) {
      drawStroke(s);
    }

    if (state.tempBox) {
      const b = state.tempBox;
      ctxMark.strokeStyle = "#4fc3f7";
      ctxMark.lineWidth = 1.5 / state.scale;
      ctxMark.setLineDash([6 / state.scale, 5 / state.scale]);
      ctxMark.strokeRect(b.x, b.y, b.w, b.h);
      ctxMark.setLineDash([]);
    }
  }

  function drawStroke(s) {
    ctxMark.strokeStyle = s.color;
    ctxMark.lineWidth = s.width / state.scale;
    ctxMark.lineCap = "round";
    ctxMark.lineJoin = "round";
    ctxMark.beginPath();

    const shp = s.shape || "free";
    if (shp === "line") {
      if (s.points.length < 2) return;
      ctxMark.moveTo(s.points[0].x, s.points[0].y);
      ctxMark.lineTo(s.points[1].x, s.points[1].y);
      ctxMark.stroke();
      return;
    }
    if (shp === "rect") {
      if (s.points.length < 2) return;
      const a = s.points[0], b = s.points[1];
      ctxMark.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      return;
    }
    if (shp === "circle") {
      if (s.points.length < 2) return;
      const a = s.points[0], b = s.points[1];
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
      ctxMark.ellipse(cx, cy, Math.max(rx, 0.001), Math.max(ry, 0.001), 0, 0, Math.PI * 2);
      ctxMark.stroke();
      return;
    }
    // free：隨意線
    if (s.points.length < 2) {
      ctxMark.fillStyle = s.color;
      ctxMark.beginPath();
      ctxMark.arc(s.points[0].x, s.points[0].y, s.width / state.scale / 2, 0, Math.PI * 2);
      ctxMark.fill();
      return;
    }
    ctxMark.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      ctxMark.lineTo(s.points[i].x, s.points[i].y);
    }
    ctxMark.stroke();
  }

  // ---------- 座標轉換 ----------
  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.ox) / state.scale,
      y: (sy - state.oy) / state.scale,
    };
  }

  // ---------- 指標互動 ----------
  const POINTERS = new Map();

  $viewer.addEventListener("pointerdown", (e) => {
    const doc = cur();
    if (!doc) return;
    if (POINTERS.size > 0) return; // MVP 單指/單滑鼠
    $viewer.setPointerCapture(e.pointerId);
    POINTERS.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.tool === "glove") {
      $viewer.classList.add("grabbing");
      state.pointer = { mode: "pan", sx: e.clientX, sy: e.clientY };
    } else if (state.tool === "zoom" || state.tool === "mag") {
      const p = screenToWorld(e.clientX, e.clientY);
      state.pointer = { mode: "box", sx: e.clientX, sy: e.clientY, wx: p.x, wy: p.y };
    } else if (state.tool === "pen") {
      const p = screenToWorld(e.clientX, e.clientY);
      doc.strokes.push({
        color: state.color,
        width: state.width,
        shape: state.shape,
        points: [{ x: p.x, y: p.y }],
      });
      state.pointer = { mode: "draw", stroke: doc.strokes[doc.strokes.length - 1] };
    }
    renderAll();
  });

  $viewer.addEventListener("pointermove", (e) => {
    if (!state.pointer) return;
    const p = state.pointer;

    if (p.mode === "pan") {
      state.ox += e.clientX - p.sx;
      state.oy += e.clientY - p.sy;
      p.sx = e.clientX; p.sy = e.clientY;
      renderAll();
    } else if (p.mode === "box") {
      const cur = screenToWorld(e.clientX, e.clientY);
      const x0 = Math.min(p.wx, cur.x), y0 = Math.min(p.wy, cur.y);
      const x1 = Math.max(p.wx, cur.x), y1 = Math.max(p.wy, cur.y);
      state.tempBox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      renderAll();
    } else if (p.mode === "draw") {
      const cur = screenToWorld(e.clientX, e.clientY);
      if (p.stroke.shape === "free") {
        const last = p.stroke.points[p.stroke.points.length - 1];
        const dx = cur.x - last.x, dy = cur.y - last.y;
        if (dx * dx + dy * dy > 0.5) p.stroke.points.push(cur);
      } else {
        p.stroke.points[1] = cur;   // 形狀：只記錄起點與目前終點
      }
      renderAll();
    }
  });

  function pointerUp(e) {
    POINTERS.delete(e.pointerId);
    try { $viewer.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!state.pointer) return;
    const p = state.pointer;
    if (p.mode === "box" && state.tempBox) {
      const b = state.tempBox;
      if (b.w > 4 / state.scale && b.h > 4 / state.scale) {
        if (state.tool === "mag") {
          createMagnifier(b);
        } else {
          zoomToWorldBox(b);
        }
      }
      state.tempBox = null;
    }
    state.pointer = null;
    $viewer.classList.remove("grabbing");
    renderAll();
    renderPdfIdle();
  }

  $viewer.addEventListener("pointerup", pointerUp);
  $viewer.addEventListener("pointercancel", pointerUp);

  // 縮放到世界座標矩形（置中填滿）
  function zoomToWorldBox(b) {
    const w = $viewer.clientWidth, h = $viewer.clientHeight;
    const s = Math.min(w / b.w, h / b.h);
    const clamped = Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);
    state.scale = clamped;
    state.ox = w / 2 - (b.x + b.w / 2) * clamped;
    state.oy = h / 2 - (b.y + b.h / 2) * clamped;
    renderPdfIdle();
  }

  // 滾輪縮放（以滑鼠為中心，CAD 手感）
  $viewer.addEventListener("wheel", (e) => {
    if (!cur()) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // 手機版縮放按鈕（沒有滾輪時用）
  document.getElementById("tb-zoomin").addEventListener("click", () => {
    if (!cur()) return;
    zoomAt($viewer.clientWidth / 2, $viewer.clientHeight / 2, 1.5);
  });
  document.getElementById("tb-zoomout").addEventListener("click", () => {
    if (!cur()) return;
    zoomAt($viewer.clientWidth / 2, $viewer.clientHeight / 2, 2 / 3);
  });

  function zoomAt(px, py, factor) {
    const w = $viewer.clientWidth, h = $viewer.clientHeight;
    const next = Math.min(Math.max(state.scale * factor, MIN_SCALE), MAX_SCALE);
    const real = next / state.scale;
    state.scale = next;
    // 錨點不變： world = (px - ox)/scale
    state.ox = px - (px - state.ox) * real;
    state.oy = py - (py - state.oy) * real;
    renderAll();
    renderPdfIdle();
  }

  // ---------- PDF 載入 ----------
  async function loadFile(file) {
    if (file.type && file.type !== "application/pdf") return;
    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      const doc = {
        pdfDoc: pdfDoc,
        numPages: pdfDoc.numPages,
        page: 1,
        strokes: [],
        fileName: file.name || "PDF",
      };
      state.docs.push(doc);
      $dropzone.classList.add("hidden");
      await switchDoc(state.docs.length - 1);
    } catch (err) {
      alert("無法讀取此 PDF：" + err.message);
    }
  }

  async function switchDoc(i) {
    if (i < 0 || i >= state.docs.length || i === state.current) return;
    state.current = i;
    const doc = cur();
    state.renderScale = 0;
    clearMagnifiers();
    state.tempBox = null;
    // 先取得頁面尺寸，才能正確 fit
    const page = await doc.pdfDoc.getPage(doc.page);
    const vp = page.getViewport({ scale: 1 });
    state.pageW = vp.width;
    state.pageH = vp.height;
    fitPage();
    await renderPdf();
    updatePageLabel();
  }

  function gotoPage(n) {
    const doc = cur();
    if (!doc) return;
    n = Math.min(Math.max(n, 1), doc.numPages);
    if (n === doc.page) return;
    doc.page = n;
    doc.strokes = [];          // 換頁清空筆跡
    state.tempBox = null;
    state.renderScale = 0;
    clearMagnifiers();
    fitPage();
    renderPdf().then(() => {
      updatePageLabel();
      renderAll();
    });
  }

  function updatePageLabel() {
    const doc = cur();
    if (!doc) return;
    $pgLabel.textContent = `${doc.page} / ${doc.numPages}`;
    $pgFile.textContent = doc.fileName;
    $pgFile.classList.toggle("active", !!doc);
  }

  $btnOpen.addEventListener("click", () => $file.click());
  $file.addEventListener("change", () => {
    if ($file.files[0]) loadFile($file.files[0]);
  });

  document.getElementById("tb-add").addEventListener("click", () => $file.click());

  ["dragenter", "dragover"].forEach((ev) =>
    $dropzone.addEventListener(ev, (e) => { e.preventDefault(); $dropzone.classList.add("drag"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    $dropzone.addEventListener(ev, (e) => { e.preventDefault(); $dropzone.classList.remove("drag"); })
  );
  $dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  $pgPrev.addEventListener("click", () => { if (cur()) gotoPage(cur().page - 1); });
  $pgNext.addEventListener("click", () => { if (cur()) gotoPage(cur().page + 1); });

  // ---------- 工具切換 ----------
  const toolBtns = { glove: "tb-glove", zoom: "tb-zoom", mag: "tb-mag", pen: "tb-pen" };
  function setTool(tool) {
    state.tool = tool;
    $viewer.classList.remove("grab", "grabbing", "zoom", "mag", "pen");
    if (tool === "glove") $viewer.classList.add("grab");
    if (tool === "zoom") $viewer.classList.add("zoom");
    if (tool === "mag") $viewer.classList.add("mag");
    if (tool === "pen") $viewer.classList.add("pen");
    $penOpts.hidden = tool !== "pen";
    for (const [t, id] of Object.entries(toolBtns)) {
      document.getElementById(id).classList.toggle("active", t === tool);
    }
  }
  for (const [tool, id] of Object.entries(toolBtns)) {
    document.getElementById(id).addEventListener("click", () => setTool(tool));
  }

  // ---------- 筆選項 ----------
  document.querySelectorAll(".shapebtn[data-shape]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.shape = btn.dataset.shape;
      document.querySelectorAll(".shapebtn[data-shape]").forEach((b) =>
        b.classList.toggle("active", b.dataset.shape === state.shape));
    });
  });
  // 放大鏡形狀：固定方框，不需要選擇面板
  document.querySelectorAll(".sw").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.color = btn.dataset.color;
      document.querySelectorAll(".sw").forEach((b) =>
        b.classList.toggle("active", b.dataset.color === state.color));
    });
  });
  document.querySelectorAll(".sw[data-color='#e53935']").forEach((b) => b.classList.add("active"));
  const widthInputs = document.querySelectorAll(".pen-width");
  widthInputs.forEach((el) => {
    el.addEventListener("input", () => {
      state.width = +el.value;
      widthInputs.forEach((x) => { x.value = el.value; });
    });
  });

  // 手機版筆面板：一個顏色點，點開色盤、選完收起
  const $penColorBtn = document.getElementById("pen-color");
  const $penMain     = document.querySelector("#pen-panel .pen-main");
  const $penColors   = document.querySelector("#pen-panel .pen-colors");
  $penColorBtn.style.background = state.color;
  $penColorBtn.addEventListener("click", () => {
    $penMain.hidden = true;
    $penColors.hidden = false;
  });
  document.querySelectorAll("#pen-panel .pen-colors .sw").forEach((btn) => {
    btn.addEventListener("click", () => {
      $penColorBtn.style.background = btn.dataset.color;
      $penColors.hidden = true;
      $penMain.hidden = false;
    });
  });

  // ---------- Undo / 清空 / 回整頁 ----------
  document.getElementById("tb-undo").addEventListener("click", () => {
    const doc = cur();
    if (doc && doc.strokes.length) { doc.strokes.pop(); renderAll(); }
  });
  document.getElementById("tb-clear").addEventListener("click", () => {
    const doc = cur();
    if (doc && doc.strokes.length) { doc.strokes = []; renderAll(); }
  });
  document.getElementById("tb-reset").addEventListener("click", resetView);

  // ---------- 放大鏡 ----------
  const MAG_FACTOR = 3;
  function clearMagnifiers() {
    for (const m of state.magnifiers) m.el.remove();
    state.magnifiers = [];
  }

  async function createMagnifier(b) {
    const doc = cur();
    if (!doc) return;
    const page = await doc.pdfDoc.getPage(doc.page);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 目標視窗尺寸：以世界座標範圍 × 目前顯示倍率 × MAG_FACTOR
    const winW = Math.max(80, b.w * state.scale * MAG_FACTOR);
    const winH = Math.max(80, b.h * state.scale * MAG_FACTOR);

    const el = document.createElement("div");
    el.className = "mag-window";
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(winW * dpr);
    canvas.height = Math.round(winH * dpr);
    canvas.style.width = winW + "px";
    canvas.style.height = winH + "px";
    el.appendChild(canvas);
    document.body.appendChild(el);

    const g = canvas.getContext("2d");
    // 以目前螢幕上的實際內容放大重繪：從 pdf-layer 擷取該區域
    // 世界→螢幕
    const sx = state.ox + b.x * state.scale;
    const sy = state.oy + b.y * state.scale;
    const sw = b.w * state.scale;
    const sh = b.h * state.scale;
    const img = $pdfLayer.toDataURL();
    const srcImg = new Image();
    srcImg.onload = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, winW, winH);
      // 從 pdf-layer 像素（CSS px）裁剪後放大繪製
      g.drawImage(srcImg, sx * dpr, sy * dpr, sw * dpr, sh * dpr, 0, 0, winW, winH);
      // 邊框
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.strokeStyle = "rgba(255,255,255,.85)";
      g.lineWidth = 2;
      g.strokeRect(1, 1, winW - 2, winH - 2);
      el.classList.add("ready");
    };
    srcImg.src = img;

    // 定位：預設放在圈選區域右下偏
    let left = sx + sw + 12;
    let top = sy + sh + 12;
    const maxL = $viewer.clientWidth - winW - 8;
    const maxT = $viewer.clientHeight - winH - 8;
    if (left > maxL) left = Math.max(8, sx - winW - 12);
    if (top > maxT) top = Math.max(8, sy - winH - 12);
    el.style.left = left + "px";
    el.style.top = top + "px";

    // 關閉按鈕
    const close = document.createElement("button");
    close.type = "button";
    close.className = "mag-close";
    close.textContent = "×";
    close.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    close.addEventListener("click", () => {
      el.remove();
      state.magnifiers = state.magnifiers.filter((m) => m.el !== el);
    });
    el.appendChild(close);

    // 拖動
    let dragging = false, dx = 0, dy = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.target === close) return;
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

    state.magnifiers.push({ el });
  }

  // 工具列釘選
  $tbPin.addEventListener("click", () => $tbWrap.classList.toggle("pinned"));

  // ---------- 快捷鍵 ----------
  window.addEventListener("keydown", (e) => {
    const doc = cur();
    if (!doc) return;
    if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); gotoPage(doc.page - 1); }
    else if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); gotoPage(doc.page + 1); }
    else if (e.key === "1") setTool("glove");
    else if (e.key === "2") setTool("zoom");
    else if (e.key === "3") setTool("pen");
    else if (e.key === "4") setTool("mag");
    else if (e.key === "r" || e.key === "R") resetView();
  });

  // 啟動
  resizeCanvases();
  setTool("glove");

  // 測試掛鉤：僅在網址帶 ?t 時啟用（正式使用不影響）
  if (new URLSearchParams(location.search).has("t")) {
    window.__app = { state, cur, zoomAt, setTool, resetView };
  }
})();