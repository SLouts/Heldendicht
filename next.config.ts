import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 節點附件(上限 10MB)、世界地圖底圖(上限 8MB)、GeoJSON 匯入(上限 5MB)
  // 都是透過 Server Action 上傳的 multipart/form-data,Next.js 預設只放行
  // 1MB 的 request body,超過的話會在我們自己的檔案大小檢查跑之前就先被擋掉。
  //
  // proxyClientMaxBodySize 是另一道獨立的限制:proxy.ts 的 matcher 幾乎
  // 涵蓋所有路徑(含 /dashboard 底下的 Server Action),Next.js 預設只會
  // 幫 proxy 緩衝前 10MB 的 request body,超過的部分會被靜默截斷(不會回
  // 錯誤,但 Server Action 那端拿到的就是不完整的 multipart body)——
  // 10MB 的預設值離我們最大的節點附件上限(10MB)太近,加上 multipart
  // 本身的 boundary/header 開銷,只要檔案接近上限就有機會被截斷,一併
  // 調高到跟 bodySizeLimit 一致。
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
