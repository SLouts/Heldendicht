import type { Metadata } from "next";
import { NewWorldForm } from "./NewWorldForm";

export const metadata: Metadata = { title: "建立世界觀" };

export default function NewWorldPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">建立世界觀</h1>
      <NewWorldForm />
    </div>
  );
}
