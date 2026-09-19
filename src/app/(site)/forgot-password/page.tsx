import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const sp = await searchParams;
  const expired = sp.error === "expired";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">忘記密碼</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        輸入註冊時用的 Email,我們會寄一封重設密碼的信給你。
      </p>
      <ForgotPasswordForm expired={expired} />
    </div>
  );
}
