/** Compress images client-side before upload — phone originals can be tens of MB */
import { t } from "../shared/i18n";

export interface CompressOptions {
  maxSide: number;
  mime: "image/jpeg" | "image/png";
  quality?: number;
  /** Pass small PNGs through unchanged (preserves logo transparency) */
  keepSmallPng?: boolean;
}

export async function compressImage(
  file: File,
  opts: CompressOptions,
): Promise<File> {
  const { maxSide, mime, quality = 0.85, keepSmallPng = false } = opts;

  if (
    keepSmallPng &&
    file.type === "image/png" &&
    file.size <= 2 * 1024 * 1024
  ) {
    return file;
  }

  // Apply EXIF orientation explicitly: some browsers skip it and portrait photos end up rotated
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t("error.imageProcess"));
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (!blob) throw new Error(t("error.imageCompress"));
  return new File([blob], "upload", { type: mime });
}
