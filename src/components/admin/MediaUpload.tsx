import { useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { uploadMedia } from "@/lib/cms-admin";

async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

const MAX_EDGE = 2000; // px — the site never displays photos larger than this
const WEBP_QUALITY = 0.82;

/** Downscale + re-encode photos before upload so the stored original is
 * never a multi-megabyte camera file. Keeps the original untouched for
 * SVG/GIF (animation/vector) or if re-encoding wouldn't make it smaller.
 * Fails soft: any error just uploads the original file. */
async function optimizeImage(file: File): Promise<{ blob: Blob; name: string; type: string }> {
  const keep = { blob: file as Blob, name: file.name, type: file.type };
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type) || typeof createImageBitmap !== "function") return keep;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return keep;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", WEBP_QUALITY));
    if (!blob || blob.type !== "image/webp" || (scale === 1 && blob.size >= file.size)) return keep;
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".webp", type: "image/webp" };
  } catch {
    return keep;
  }
}

export function MediaUpload({
  folder,
  value,
  onChange,
}: {
  folder: "news" | "events" | "gallery" | "staff" | "partners" | "settings";
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    setBusy(true);
    try {
      const opt = await optimizeImage(file);
      const base64 = await fileToBase64(opt.blob);
      const res = await uploadMedia({
        data: { folder, filename: opt.name, contentType: opt.type, base64 },
      });
      onChange(res.url);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img src={value} alt="" className="aspect-[16/9] w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <Upload className="h-6 w-6" />
          <span>{busy ? "Uploading…" : "Click to upload cover image"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}
    </div>
  );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
