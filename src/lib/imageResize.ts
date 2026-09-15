/**
 * 世界地圖底圖卡頓的其中一個根因:上傳時只限制檔案大小(bytes),沒有
 * 限制實際像素尺寸——一張手機拍的高解析度圖,即使壓縮後不到 8MB,寬高
 * 可能還是好幾千像素,拖曳/縮放時瀏覽器每一幀都要重新解碼、合成這張
 * 巨大的點陣圖,效能弱的裝置(手機、舊電腦)撐不住就會嚴重卡頓,效能好
 * 的裝置感覺不到——這也是為什麼只有「部分用戶」回報卡頓。
 *
 * 這裡在上傳前用 canvas 把過大的圖片縮小到合理的最大邊長,維持原本的
 * 圖片格式(PNG 用 PNG、WebP 用 WebP,避免把線條/文字很多的地圖圖片
 * 轉成有損壓縮的 JPEG 造成模糊),已經在範圍內的圖片原樣直接使用,不重新
 * 編碼、不影響畫質。
 */
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.85;

export async function downscaleImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // 解碼失敗就交給原本的上傳流程處理(它自己的格式/內容檢查會抓到問題)。
    return file;
  }

  const { width, height } = bitmap;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bitmap.close();
    return file;
  }

  const scale = MAX_DIMENSION / Math.max(width, height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const outputType =
    file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, JPEG_QUALITY),
  );
  if (!blob) return file;

  const ext = outputType.split("/")[1];
  const baseName = file.name.replace(/\.[^./\\]+$/, "");
  return new File([blob], `${baseName}.${ext}`, { type: outputType });
}
