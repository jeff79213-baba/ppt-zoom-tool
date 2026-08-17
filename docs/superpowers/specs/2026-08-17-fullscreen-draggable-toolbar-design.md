# 全螢幕＋可拖動工具列＋透明度＋垃圾桶清空 設計文件

日期：2026-08-17
狀態：已確認

## 動機

手機/平板使用時，瀏覽器的工具列與網址列會壓縮主畫面內容。需要全螢幕功能讓主畫面不被壓縮；同時工具列常駐顯示時可能遮蓋畫面，需可拖動與調透明度。

## 功能規格

### 1. 全螢幕（手機/平板為主）

- 工具列新增「全螢幕」按鈕（功能群組），快捷鍵 **F** 切換
- 使用 HTML5 Fullscreen API（`document.documentElement.requestFullscreen()` / `document.exitFullscreen()`）
- 監聽 `fullscreenchange` 事件，切換按鈕圖示（進入＝張開、退出＝縮回）
- 進入全螢幕後瀏覽器工具列/網址列收掉，主畫面不被壓縮
- 全螢幕下工具列仍可拖動、可調透明度

### 2. 可拖動工具列

- 工具列左側新增 **☰ 三橫線拖動手把**（`.tb-drag`），按住可拖到任意位置
- 支援滑鼠與觸控（pointer events）
- 移除「滑鼠移到底部邊緣才浮現」機制，工具列**常駐顯示**
- 位置存 `localStorage`（key：`pptzoom_toolbarPos`），下次開啟還原
- 未儲存位置時預設置中底部
- 釘選鈕（`.tb-pin`）保留，改為「鎖定/解鎖拖動」：鎖定時手把失效、位置固定

### 3. 透明度調整

- 工具列右側新增透明度滑桿（0–100%），拖動即時改變工具列不透明度
- 值存 `localStorage`（key：`pptzoom_toolbarOpacity`），預設 100
- 滑桿亦支援觸控

### 4. 垃圾桶＝清空全部

- `tb-clear` 一次清除**全部筆跡＋全部放大鏡視窗**
- 移除獨立「刪除選取放大鏡」按鈕（`#tb-delmag`）與長按選取邏輯（`selectMag`、`removeMag`、`selectedMag`）
- 放大鏡視窗保留右上角 × 關閉鈕（個別關閉）

## 技術實作重點

- 工具列容器改用 `position: fixed` + `left/top` 定位（不再用底部置中 transform）
- 拖動手把 pointerdown 開始，pointermove 更新位置，pointerup 儲存到 localStorage
- 透明度滑桿 input 事件即時設 `toolbar.style.opacity`，並存 localStorage
- 全螢幕按鈕圖示用 SVG 切換；`fullscreenchange` 時更新
- localStorage key 皆加 `pptzoom_` 前綴（符合專案命名規則）