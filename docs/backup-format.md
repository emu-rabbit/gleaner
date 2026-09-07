# 搬家備份 v1

此格式由拾穗人專案定義，工坊與秘笈的搬家匯入器尚未實作。這不是現有的單筆筆記、秘笈或實驗 JSON 格式；不可直接交給既有單筆匯入功能。

## JSON envelope

工坊與秘笈各下載一份 UTF-8 JSON，不混合兩個專案：

```json
{
  "format": "frozen-rabbit-workshop-backup",
  "version": 1,
  "exportedAt": "2026-09-07T00:00:00.000Z",
  "sourceOrigin": "https://emu-rabbit.github.io",
  "data": {
    "frozen-rabbit-favorites-data": "[{\"id\":\"example\",\"name\":\"收藏\"}]",
    "frozen-rabbit-lang": "tw"
  }
}
```

秘笈使用 `format: "frozen-rabbit-tome-backup"`。`version` 固定為整數 `1`；`exportedAt` 是 UTC ISO 8601。`sourceOrigin` 是下載時的實際 origin，本機預覽因此會記錄本機 origin，不冒充正式站。

`data` 為 **完整 storage key → 原始字串**，不是解析後的物件。VueUse 的字串、布林與 JSON serializer 不相同，故不得對每個值一律 JSON.parse 再重建備份。內層 JSON 的空白、排列、未知欄位與歷史版本內容皆原樣保存。缺少的 key 不加入，不注入預設值。

## 收錄範圍

精確 allowlist 以 [`src/backup.js`](../src/backup.js) 的 `projects` 為唯一維護來源，2026-09-07 對照兩個 sibling checkout 的 `src/composables`、秘笈的 `src/views` 與 `frontierCollectableStorage.ts`。

| 專案 | 資料 | 摘要計數 |
| --- | --- | --- |
| 工坊 | `favorites-data`、`notes` | 各陣列長度 |
| 工坊 | 語系、市場區域／資料中心／策略、深色模式 | 實際存在的 5 種設定 key 數量 |
| 秘笈 | `favorite-items`、`library`、`experiments`、`frontier-studies`、`gear-profiles` | 各陣列長度 |
| 秘笈 | 語系、3 種顯示模式、深色模式、巨集／求解器／前瞻設定、收藏篩選、求解器能力值、食物、節點加成、舊版 `user-stats` | 實際存在的 13 種設定 key 數量 |

工坊 key 前綴是 `frozen-rabbit-`，秘笈是 `frozen-rabbit-tome-`。設定數不是物件內的欄位數。資料陣列只做基本外形檢查，不宣稱每筆內容符合新站 schema。舊版 `user-stats` 原樣保存，留待匯入器按新版 gear migration 規則處理。

不收錄追蹤同意、debug 設定、首次使用旗標、未知 key、其他專案資料或可重新下載的遊戲快取。資料不以 prefix 掃描、不上傳、不修改、不刪除。

秘笈的 `frozen-rabbit-tome-active-item` 是求解台目前選中的物品，不納入備份或設定計數，也不讀取或刪除原值。使用者到新站重新選擇物品即可。早期 v1 備份可能包含此 key；後續匯入器應略過，不還原。

## 異常行為

- 沒有任何 allowlist key：顯示空狀態並停用下載。
- 已保存的空陣列／設定：仍可備份；摘要忠實顯示 0 或實際 key 數。
- 無法解析或外形不符：該類摘要顯示 `—` 並提示；仍保留原始字串，避免遺失可救援內容。
- 任何 storage 讀取拋出例外：整份視為讀取受阻，禁止輸出部分備份。
- 每次按下載重新讀取。其他分頁觸發 storage event、頁面重新聚焦時更新摘要。
- 正式 origin 以外停用下載並提供原址；localhost 僅供測試，清楚標示來源不同。
- 下載提示只代表已呼叫瀏覽器下載，不保證作業系統成功存檔。

## 新站匯入器接手契約

1. 驗證 format、version、data 為物件及其值皆為字串；限制檔案大小並只接收對應專案的 allowlist。未知 format／version 拒絕，不得任意寫入 localStorage。
2. 依 key 的 serializer 解析並驗證內容，對 collection 使用原專案 schema／歷史遷移規則。格式異常的項目應提示，不得靜默遺漏後宣告完整匯入。
3. 先預覽可還原數量與衝突，再由使用者選擇處理方式。ID、重複匯入去重、已有資料的合併／覆蓋，以及舊版裝備能力值的轉換，由各專案制定；本頁不先改寫。
4. 寫入前保留新站原值；處理 quota／storage 失敗與回復。匯入後重整仍應保存內容。
5. 不搬移 analytics consent；不根據 sourceOrigin 直接信任檔案內容。任何下載的 JSON 都應重新驗證。

端到端驗收需包含工坊／秘笈各自備份、四語、僅設定、空陣列、大量資料、損壞值、舊版資料、未知版本、重複匯入與新站已有資料的衝突。新舊 origin 與實際手機下載／選檔流程需另外驗收。
