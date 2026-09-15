import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 節點附件(上限 10MB)、世界地圖底圖(上限 8MB)、GeoJSON 匯入(上限 5MB)
  // 都是透過 Server Action 上傳的 multipart/form-data,Next.js 預設只放行
  // 1MB 的 request body,超過的話會在我們自己的檔案大小檢查跑之前就先被擋掉。
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
