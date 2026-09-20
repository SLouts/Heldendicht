import Link from "next/link";

/**
 * 全站固定頁尾——版權/測試版聲明+聯絡方式,掛在 Root Layout 裡,所有
 * 頁面(對外頁面跟後台)都會看到,不用在每個 layout 各自重複一份。
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
      <p>
        © 2026 Heldendicht。本站目前為測試版本,所有上傳資料請創作者自行妥善備份。若發現違規條目或系統錯誤,請洽{" "}
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
