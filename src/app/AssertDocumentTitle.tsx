"use client";

import { useEffect } from "react";

/**
 * 掛載時直接用 document.title 補設一次分頁標題——給「伺服器端 <title>
 * 其實是對的,但後續被純 client-side render 蓋掉」這種情況當保險,見
 * not-found.tsx 的說明。平常走正常 hydrate 的頁面不需要這個元件,
 * metadata API 自己就會處理好。
 */
export function AssertDocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
