import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Cinzel,
  Courier_Prime,
  Kalam,
  Bebas_Neue,
  IM_Fell_English_SC,
  Playfair_Display,
  Cormorant_Garamond,
} from "next/font/google";
import Script from "next/script";
import { ArtThemeSwitcher } from "@/components/ArtThemeSwitcher";
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

// 各美術方向各自的標題顯示字,只涵蓋拉丁字母——中文標題一律靠
// globals.css 裡的系統襯線字型堆疊(Songti TC / PMingLiU 等)接手顯示,
// 不特地為每個方向多載入一套大型中文 webfont。實際套用哪一個交給
// globals.css 的 --font-display 依 data-art-theme 切換。
const illuminated = Cinzel({
  variable: "--font-illuminated",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
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
const card = Bebas_Neue({
  variable: "--font-card",
  subsets: ["latin"],
  weight: ["400"],
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

export const metadata: Metadata = {
  title: "Heldendicht",
  description: "多世界觀企劃介紹與玩家共筆平台",
};

// 在 hydrate 之前就把上次選的美術方向套到 <html> 上,避免畫面先閃一下
// 預設方向再跳成使用者選的方向。純讀 localStorage,沒有帳號層級的設定,
// 訪客不登入也能用。
const bootstrapArtTheme = `(function(){try{var v=localStorage.getItem(${JSON.stringify(ART_THEME_STORAGE_KEY)});if(v&&${JSON.stringify(ART_THEME_IDS)}.indexOf(v)>-1){document.documentElement.setAttribute(${JSON.stringify(ART_THEME_ATTR)},v);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${illuminated.variable} ${script.variable} ${field.variable} ${card.variable} ${scroll.variable} ${cartographer.variable} ${almanac.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="art-theme-bootstrap" strategy="beforeInteractive">
          {bootstrapArtTheme}
        </Script>
        {children}
        <ArtThemeSwitcher />
      </body>
    </html>
  );
}
