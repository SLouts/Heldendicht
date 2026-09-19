import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/forgot-password?error=expired");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">設定新密碼</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        請輸入你的新密碼。
      </p>
      <ResetPasswordForm />
    </div>
  );
}
