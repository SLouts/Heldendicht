import type { ReportReasonCategory, ReportStatus } from "@/lib/supabase/database.types";

/** 檢舉表單、各世界觀檢舉列表、全站檢舉總覽共用的理由分類標籤。 */
export const REPORT_REASON_CATEGORY_LABEL: Record<ReportReasonCategory, string> = {
  infringement: "侵權",
  content_violation: "違規內容",
  setting_conflict: "設定衝突",
  other: "其他",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "待處理",
  resolved: "已處理",
  dismissed: "已駁回",
};
