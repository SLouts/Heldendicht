import Link from "next/link";
import { AttachmentsDemoClient } from "./AttachmentsDemoClient";

export default function AttachmentsDemoPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 回後台首頁
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">附件與嵌入圖片怎麼運作</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        這是純前端的示範頁,不會真的連到資料庫或上傳檔案 —— 重新整理就會回到初始狀態。
        右上角可以切換身分,看看有沒有編輯權限時畫面差在哪;上傳的圖片只存在這次瀏覽當中。
      </p>
      <AttachmentsDemoClient />
    </div>
  );
}
