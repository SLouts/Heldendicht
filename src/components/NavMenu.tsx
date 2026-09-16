/**
 * 世界觀頁面的導覽——一整條橫幅狀的導覽列,連結平鋪橫向排列在同一條
 * 底色列裡(不是分開的按鈕,也不是收合在單一按鈕後面的下拉選單)。
 */
export function NavMenu({ children }: { children: React.ReactNode }) {
  return (
    <nav className="mt-4 flex w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-lg bg-muted px-2 py-1.5 text-sm">
      {children}
    </nav>
  );
}
