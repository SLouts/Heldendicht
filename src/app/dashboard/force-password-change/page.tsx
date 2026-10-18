import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { ChangePasswordForm } from "@/app/dashboard/profile/ChangePasswordForm";

export const metadata: Metadata = { title: "請先修改密碼" };

/**
 * 站務手動重設密碼時勾選「強制下次登入改密碼」,proxy.ts 會把帶著
 * force_password_change claim 的請求攔到這裡——改密碼成功後
 * changePassword() 會順便清掉這個旗標,之後才能正常進入 /dashboard。
 */
export default async function ForcePasswordChangePage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">請先修改密碼</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        站務已經協助重設過這個帳號的密碼,為了安全,請先修改成只有你自己知道的新密碼,才能繼續使用網站。
      </p>
      <ChangePasswordForm />
    </div>
  );
}
