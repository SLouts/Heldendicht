import Link from "next/link";
import { AttachmentsDemoClient } from "./AttachmentsDemoClient";

export default function AttachmentsDemoPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 回後台首頁
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">附件與嵌入圖片怎麼運作</h1>
      <AttachmentsDemoClient />
    </div>
  );
}
