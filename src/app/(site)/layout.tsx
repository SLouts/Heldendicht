import { SiteHeader } from "@/components/SiteHeader";

/**
 * 對外頁面(首頁、世界觀瀏覽/節點頁、登入/註冊等帳號頁、玩家個人頁)
 * 共用的 route group layout——只負責掛上共用頁首,不影響 URL(route
 * group 的資料夾名稱不會出現在網址裡)。後台 /dashboard 是這個 group
 * 之外的獨立路由,維持自己專屬的頁首,不受這裡影響。
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
