import Link from "next/link";

// 首頁不再直接列世界觀入口——全部移到「探索公開世界觀」(/worlds)那頁,
// 首頁只當作單純的介紹/導覽頁。
export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          歡迎來到多世界觀企劃站
        </h1>
        <p className="mt-4 text-muted-foreground">
          想看看已經有哪些世界觀嗎?
          <Link href="/worlds" className="ml-1 underline">
            探索公開世界觀
          </Link>
        </p>
      </main>
    </div>
  );
}
