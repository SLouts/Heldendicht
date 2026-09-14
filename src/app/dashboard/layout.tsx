import { requireUser, getCurrentProfile } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";

// /dashboard 底下都需要登入。proxy.ts 已經做了一次「優化用」的導向,
// 這裡是真正的檢查點 —— 沒登入會被 requireUser() 導去 /login。
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">後台</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {profile?.display_name ?? profile?.email}
            </span>
            <form action={logout}>
              <button type="submit" className="underline">
                登出
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
