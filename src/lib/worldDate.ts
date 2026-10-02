/**
 * 世界觀自己的曆法——年份(可正可負、可超大)是必填的粗粒度,月/日都是
 * 選填的補充精確度(見 migration 035),不是地球西元曆,不驗證月份實際
 * 天數。這裡只提供兩個共用的小工具:算一個可以拿來排序/畫在橫向時間軸
 * 上的連續數值,以及組成人看的顯示字串。
 */

/** 月/日都沒填就退回整數年份本身;有填就往年份內部挪一點位置,讓同一年
 * 內月/日不同的項目在時間軸上還能照先後排開,但不會跨到下一年去。 */
export function worldDateValue(
  year: number,
  month?: number | null,
  day?: number | null,
): number {
  const m = month ?? 1;
  const d = day ?? 1;
  return year + (m - 1) / 12 + (d - 1) / (12 * 31);
}

/** "1914" / "1914.03" / "1914.03.01",依實際填了多細而定。 */
export function formatWorldDate(
  year: number,
  month?: number | null,
  day?: number | null,
): string {
  if (month == null) return `${year}`;
  const mm = String(month).padStart(2, "0");
  if (day == null) return `${year}.${mm}`;
  const dd = String(day).padStart(2, "0");
  return `${year}.${mm}.${dd}`;
}
