"use client";

import { useState } from "react";

/**
 * 防雷圖片:標記防雷的附件圖片,不直接渲染 <img>(避免瀏覽器提前把圖片
 * 下載下來),改成一個警示按鈕,讀者主動點擊後才掛上 <img> 元素。
 * 跟純 CSS 模糊不同——CSS 模糊底層還是會把圖抓下來,這裡是真的延後載入。
 */
export function SpoilerImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className={
        (className ?? "") +
        // 用 !important 蓋掉呼叫端傳入的 border/背景色(例如 border-border),
        // 避免跟這裡的警示樣式在 Tailwind 生成的 CSS 裡順序打架、顏色不可預期。
        " flex items-center justify-center gap-1.5 !border !border-dashed !border-badge-pending-fg/40 !bg-badge-pending-bg p-3 text-center text-xs !text-badge-pending-fg"
      }
    >
      ⚠️ 防雷圖片,點擊查看
    </button>
  );
}
