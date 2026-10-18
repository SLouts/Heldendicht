/**
 * 報名/抽籤這類「真實世界時間」的輸入輸出——跟 worldDate.ts 的虛構曆法
 * 是兩回事。<input type="datetime-local"> 給的字串沒有時區資訊,照瀏覽器
 * 當地時間認;伺服器端(Vercel,執行時區是 UTC)如果直接 new Date()
 * 解析,會把這個字串當成 UTC 時間算,跟使用者(預設台灣時區)原本想輸入
 * 的時間差了 8 小時。台灣固定 UTC+8、沒有日光節約時間,直接補一個固定
 * 的 +08:00 偏移,不管程式實際跑在哪個時區都能算出正確的時間點,不需要
 * 額外的時區資料庫。
 */

/** datetime-local 表單值(視為台灣當地時間)→ 正確的 UTC ISO 字串。 */
export function fromTaipeiDatetimeLocalValue(value: string): string {
  return new Date(`${value}:00+08:00`).toISOString();
}

/** UTC ISO 字串 → 台灣當地時間的 datetime-local 表單值(YYYY-MM-DDTHH:mm)。 */
export function toTaipeiDatetimeLocalValue(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** UTC ISO 字串 → 台灣當地時間的顯示字串,給畫面直接顯示用。 */
export function formatTaipeiDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
