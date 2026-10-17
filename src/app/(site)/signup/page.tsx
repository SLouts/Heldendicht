import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "註冊",
  description: "用邀請碼註冊 Heldendicht,開始建立世界觀或加入別人的企劃。",
};

export default function SignupPage() {
  return <SignupForm />;
}
