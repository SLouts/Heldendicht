/** 使用者頭貼,固定 8x8(2rem)——沒有頭貼時顯示一個灰底圓形佔位。 */
export function Avatar({ url, alt = "" }: { url: string | null; alt?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- public bucket 網址,無法用 next/image 白名單網域
    <img src={url} alt={alt} className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
  );
}
