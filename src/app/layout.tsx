import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Courier_Prime,
  Kalam,
  IM_Fell_English_SC,
  Playfair_Display,
  Cormorant_Garamond,
  Pinyon_Script,
} from "next/font/google";
import Script from "next/script";
import { ArtThemeSwitcher } from "@/components/ArtThemeSwitcher";
import { SiteFooter } from "@/components/SiteFooter";
import { ART_THEME_ATTR, ART_THEME_IDS, ART_THEME_STORAGE_KEY } from "@/lib/artTheme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 各主題各自的標題顯示字,只涵蓋拉丁字母——中文標題一律靠
// globals.css 裡的系統襯線字型堆疊(Songti TC / PMingLiU 等)接手顯示,
// 不特地為每個方向多載入一套大型中文 webfont。實際套用哪一個交給
// globals.css 的 --font-display 依 data-art-theme 切換。
const script = Courier_Prime({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const field = Kalam({
  variable: "--font-field",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const scroll = IM_Fell_English_SC({
  variable: "--font-scroll",
  subsets: ["latin"],
  weight: ["400"],
});
const cartographer = Playfair_Display({
  variable: "--font-cartographer",
  subsets: ["latin"],
  weight: ["700"],
});
const almanac = Cormorant_Garamond({
  variable: "--font-almanac",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["italic"],
});
// 首頁大標題專用的花體字——取代之前直接把標題文字寫成 Unicode 數學
// 花體字元(例如 𝓒𝓸𝓰𝓲𝓽𝓸)的做法(那樣會壞掉複製貼上、螢幕報讀器唸法,
// 也不保證每個裝置都有對應字型可顯示)。改成存一般文字,樣式交給這個
// CSS 字型,只影響首頁大標題,不跟六種美術方向的 --font-display 共用
// (那組是給各主題標題用的展示字,跟首頁大標題是獨立的裝飾需求)。
const heroTitleFont = Pinyon_Script({
  variable: "--font-hero-title",
  subsets: ["latin"],
  weight: "400",
});

// 個別頁面(世界觀/條目/角色頁等)用 generateMetadata 把自己的標題塞進
// title.template,瀏覽器分頁、分享連結、搜尋引擎才看得出「這是哪個世界觀
// 的哪個條目」,不是每一頁都顯示同一個「Heldendicht」。
// openGraph.images 是全站預設的分享預覽圖——世界觀/條目頁等有自己橫幅
// 的頁面會在各自的 generateMetadata 回傳自己的 images 蓋掉這個預設值,
// 這裡只給「沒有自訂圖」的頁面(首頁、/worlds、登入/註冊等)一個有品牌
// 識別的預覽圖,不要讓分享連結整個沒有圖或退回瀏覽器自己的空白預覽。
// metadataBase 讓各頁面回傳的相對路徑圖片網址(例如 /og-default.png)能
// 正確組成完整網址——沒設定的話 Next.js 會回退用 http://localhost:3000,
// 分享連結在正式環境會指向錯的網址。VERCEL_PROJECT_PRODUCTION_URL 是
// Vercel 專案自動注入、固定指向正式網域的環境變數(不會隨每次部署的
// 預覽網址變動),本地開發沒有這個變數時才退回 localhost。
const metadataBase = new URL(
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Heldendicht",
    template: "%s ｜ Heldendicht",
  },
  description: "多世界觀企劃介紹與玩家共筆平台",
  openGraph: {
    siteName: "Heldendicht",
    images: ["/og-default.png"],
  },
};

// 在 hydrate 之前就把上次選的美術方向套到 <html> 上,避免畫面先閃一下
// 預設方向再跳成使用者選的方向。純讀 localStorage,沒有帳號層級的設定,
// 訪客不登入也能用。
const bootstrapArtTheme = `(function(){try{var v=localStorage.getItem(${JSON.stringify(ART_THEME_STORAGE_KEY)});if(v&&${JSON.stringify(ART_THEME_IDS)}.indexOf(v)>-1){document.documentElement.setAttribute(${JSON.stringify(ART_THEME_ATTR)},v);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${script.variable} ${field.variable} ${scroll.variable} ${cartographer.variable} ${almanac.variable} ${heroTitleFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="art-theme-bootstrap" strategy="beforeInteractive">
          {bootstrapArtTheme}
        </Script>
        {children}
        <SiteFooter />
        <ArtThemeSwitcher />
      </body>
    </html>
  );
}
