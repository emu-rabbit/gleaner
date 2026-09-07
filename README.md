# 拾穗人的委託

協助使用者下載留在 `https://emu-rabbit.github.io` 的冷凍兔肉工坊與秘笈資料。四語系單頁靜態網站，無執行期相依套件、外部字型、分析追蹤或資料上傳。

## 開發

需要 Node.js 24，無須安裝套件。

```sh
npm test
npm run dev
npm run build
npm run preview
```

本機預覽：`http://127.0.0.1:4173/`。本機資料與 GitHub Pages 資料屬於不同 origin；本機無法讀取正式站的收藏。請使用獨立測試瀏覽器設定檔放入測試資料，勿清除使用者原始資料。

選用瀏覽器驗證：先建置並啟動 `npm run preview`，另開終端執行 `node scripts/browser-check.mjs <已安裝的-playwright/index.mjs-路徑>`。此檢查使用獨立的暫時 Chromium context，不接觸個人的瀏覽器設定檔；下載與截圖寫至已忽略的 `artifacts/`。需要已安裝 Playwright 與其 Chromium，但網站與基本測試不依賴它們。正式 origin 的檢查以本機攔截回應模擬，不代表已發布。

## 網址與部署

預定入口：`https://emu-rabbit.github.io/gleaner/`。

進入頁面時，語系與明暗分別讀取工坊設定，再讀秘笈設定；缺少或無效的語系退回繁中，明暗退回系統偏好。支援 `tw`、`cn`、`ja`、`en` 四種原站語系值。網址 query 不控制語系。

右上方保留語系選單與明暗切換，手動調整只套用於本次頁面，不修改舊站資料或網址。重新載入會再次按上述優先級讀取。

GitHub Pages 的 Source 設為 **GitHub Actions**，推送 `main` 後由工作流程測試、建置並部署。PR 只測試建置。本專案不可設定自訂網域或加入 CNAME；必須保留原 HTTPS origin 才能讀到舊資料。如果帳號層級 Pages 設定導致轉址，也必須先修正，並確認最終網址仍是 `https://emu-rabbit.github.io/gleaner/`。

## 維護與驗收

- `src/backup.js`：storage allowlist、摘要、備份封裝的唯一來源。
- `src/i18n.js`：四語文案。
- `src/preferences.js`：讀取原站語系與明暗偏好的優先級。
- `src/assets/workshop.png`、`src/assets/tome.png`：各站 `index.html` 實際指定的 favicon（各自的 `public/logo.png`），本機保存以避免新站轉址影響。
- `src/style.css`：沿用兩個原專案 soft-green 色票、slate 文字／深色模式、系統字型、16px 卡片圓角與 24px 間距。
- [備份格式與匯入器接手文件](docs/backup-format.md)：本專案先定義 v1；工坊／秘笈後續實作搬家匯入器。既有單筆 JSON 匯入功能不支援此備份格式。

發布後仍須以有資料的原瀏覽器確認兩份 JSON 能下載，再於新站完成匯入、重整保留、重複匯入與衝突處理的端到端驗收。手機 Safari／Chrome 的實際存檔流程需另外驗證。
