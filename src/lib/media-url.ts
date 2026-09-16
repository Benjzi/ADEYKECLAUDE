import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side helpers to resolve stored media URLs to signed URLs.
 * The `media` bucket is private, so images must be served via signed URLs.
 */

function extractPath(stored: string | null): string | null {
  if (!stored) return null;
  const s = stored.trim();
  if (!s) return null;
  const pub = s.match(/\/object\/public\/media\/([^?]+)/);
  if (pub) return decodeURIComponent(pub[1]);
  const sig = s.match(/\/object\/sign\/media\/([^?]+)/);
  if (sig) return decodeURIComponent(sig[1]);
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, "");
  return null;
}

const SIGN_TTL = 60 * 60 * 24 * 7;

/** Default render width. Photos are uploaded at full resolution, but the
 * site never displays them larger than ~1600px, and most places show them
 * far smaller. Serving the original bytes made pages slow, so signed URLs
 * now request a resized, re-compressed version from Supabase's image
 * transformer instead. */
const DEFAULT_TRANSFORM = { width: 1280, quality: 72 } as const;

type Transform = { width?: number; height?: number; quality?: number };

export async function signMediaUrl(stored: string | null, transform: Transform = DEFAULT_TRANSFORM): Promise<string | null> {
  const path = extractPath(stored);
  if (!path) return stored;
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, SIGN_TTL, { transform });
  if (error || !data) return stored;
  return data.signedUrl;
}

export async function signMediaUrlsBatch(stored: (string | null)[], transform: Transform = DEFAULT_TRANSFORM): Promise<(string | null)[]> {
  const paths = stored.map(extractPath);
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (uniquePaths.length === 0) return stored;
  const { data, error } = await supabase.storage.from("media").createSignedUrls(uniquePaths, SIGN_TTL);
  if (error || !data) return stored;
  const map = new Map<string, string>();
  data.forEach((d, i) => {
    if (d.signedUrl) {
      // createSignedUrls has no transform option, so append the render
      // params to the returned URL — the storage render endpoint accepts
      // them as query params on an already-signed URL.
      const u = new URL(d.signedUrl);
      if (transform.width) u.searchParams.set("width", String(transform.width));
      if (transform.height) u.searchParams.set("height", String(transform.height));
      if (transform.quality) u.searchParams.set("quality", String(transform.quality));
      map.set(uniquePaths[i], u.toString());
    }
  });
  return paths.map((p, i) => (p && map.get(p)) || stored[i]);
}

export async function resolveField<T>(rows: T[], key: keyof T, transform?: Transform): Promise<T[]> {
  if (rows.length === 0) return rows;
  const signed = await signMediaUrlsBatch(rows.map((r) => ((r as any)[key] as string | null) ?? null), transform);
  const out = new Array<T>(rows.length);
  for (let i = 0; i < rows.length; i++) out[i] = { ...(rows[i] as any), [key]: signed[i] } as T;
  return out;
}
