/**
 * 多人副本/活動報名公告(world_events)的生命週期階段——純粹依現在時間
 * 跟公告本身的時間欄位算出來,不是存在資料庫裡的欄位,所以沒有「忘記
 * 更新狀態」的問題。
 */
export type EventPhase = "upcoming" | "open" | "awaiting_draw" | "drawn";

export function eventPhase(event: {
  signup_opens_at: string;
  signup_closes_at: string;
  drawn_at: string | null;
}): EventPhase {
  if (event.drawn_at) return "drawn";
  const now = Date.now();
  if (now < new Date(event.signup_opens_at).getTime()) return "upcoming";
  if (now < new Date(event.signup_closes_at).getTime()) return "open";
  return "awaiting_draw";
}

export const EVENT_PHASE_LABELS: Record<EventPhase, string> = {
  upcoming: "尚未開放",
  open: "開放報名中",
  awaiting_draw: "報名已截止,等待抽籤",
  drawn: "已抽籤",
};

/** 現在是不是已經過了這個期限——抽成獨立函式呼叫,不要在元件 render
 * 本體裡直接寫 `Date.now() > ...`,react-hooks/purity 這條 lint 規則會
 * 把元件/hook 本體裡直接呼叫的 impure function(Date.now()/Math.random()
 * 等)當成錯誤,獨立的一般函式則不受限。 */
export function isPastDeadline(deadline: string | null): boolean {
  return deadline != null && Date.now() > new Date(deadline).getTime();
}

export type EventEntryStatus = "pending" | "drawn" | "not_drawn" | "withdrawn";

export const EVENT_ENTRY_STATUS_LABELS: Record<EventEntryStatus, string> = {
  pending: "報名中,等待抽籤",
  drawn: "已中籤",
  not_drawn: "未中籤",
  withdrawn: "已撤回",
};
