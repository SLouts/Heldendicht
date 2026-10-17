import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "登入",
  description: "登入 Heldendicht,管理你的世界觀與角色。",
};

export default function LoginPage() {
  return <LoginForm />;
}
