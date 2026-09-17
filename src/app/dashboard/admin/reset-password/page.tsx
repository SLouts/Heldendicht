import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ResetUserPasswordForm } from "./ResetUserPasswordForm";

export default async function AdminResetPasswordPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">手動重設密碼</h1>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">手動重設密碼</h1>
      <ResetUserPasswordForm />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
      ← 回後台首頁
    </Link>
  );
}
