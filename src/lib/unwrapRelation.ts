/**
 * Supabase 的 embedded relation 查詢結果,PostgREST 依關聯基數有時回傳
 * 陣列、有時回傳單一物件(或 null/undefined),全站有 20 幾個檔案各自
 * 手寫 `Array.isArray(x) ? x[0] : x` 這段三元判斷式去展開,抽成這個
 * 共用函式,行為完全比照原本的寫法(不做額外處理):陣列時取第一筆
 * (空陣列會是 undefined),不是陣列時原封不動傳回(含 null/undefined)。
 */
export function unwrapRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 跟 unwrapRelation 相反方向——有些情境(例如要 flatMap)需要固定拿到
 * 陣列,不管 PostgREST 原本回傳的是陣列、單一物件還是 null/undefined。
 */
export function toRelationArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}
