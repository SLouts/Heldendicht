import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Courier_Prime,
  Kalam,
  IM_Fell_English_SC,
  Playfair_Display,
  Cormorant_Garamond,
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

// 個別頁面(世界觀/條目/角色頁等)用 generateMetadata 把自己的標題塞進
// title.template,瀏覽器分頁、分享連結、搜尋引擎才看得出「這是哪個世界觀
// 的哪個條目」,不是每一頁都顯示同一個「Heldendicht」。
export const metadata: Metadata = {
  title: {
    default: "Heldendicht",
    template: "%s ｜ Heldendicht",
  },
  description: "多世界觀企劃介紹與玩家共筆平台",
};

// 在 hydrate 之前就把上次選的美術方向套到 <html> 上,避免畫面先閃一下
// 預設方向再跳成使用者選的方向。純讀 localStorage,沒有帳號層級的設定,
// 訪客不登入也能用。
const bootstrapArtTheme = `(function(){try{var v=localStorage.getItem(${JSON.stringify(ART_THEME_STORAGE_KEY)});if(v&&${JSON.stringify(ART_THEME_IDS)}.indexOf(v)>-1){document.documentElement.setAttribute(${JSON.stringify(ART_THEME_ATTR)},v);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${script.variable} ${field.variable} ${scroll.variable} ${cartographer.variable} ${almanac.variable} h-full antialiased`}
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
