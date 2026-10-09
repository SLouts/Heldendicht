import Link from "next/link";

/**
 * 全站固定頁尾——版權+聯絡方式,掛在 Root Layout 裡,所有頁面(對外
 * 頁面跟後台)都會看到,不用在每個 layout 各自重複一份。
 *
 * 測試版聲明/備份提醒已經搬到首頁的 Hero 區塊(site_settings.
 * disclaimer_content,站務可自行編輯),這裡不重複講一次同樣的內容——
 * 首頁是訪客第一個會看到的頁面,頁尾這段只保留「找得到人」需要的聯絡
 * 方式就好。
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
      <p>
        © 2026 Heldendicht。若發現違規條目或系統錯誤,請洽{" "}
        <a
          href="mailto:heldendicht.cit@gmail.com"
          className="underline underline-offset-2 hover:text-foreground"
        >
          站務人員信箱
        </a>
        {" "}或聯繫{" "}
        <Link href="/staff" className="underline underline-offset-2 hover:text-foreground">
          站務人員
        </Link>
        。
      </p>
    </footer>
  );
}
