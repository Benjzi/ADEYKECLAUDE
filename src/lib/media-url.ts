import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side helpers to resolve stored media URLs to signed URLs.
 * The `media` bucket is private, so images must be served via signed URLs.
 *
 * Why this file is shaped the way it is (image-loading root cause):
 *
 * 1. Resizing only works if the *signing request* asks for it. The batch
 *    `createSignedUrls` API has no transform option and returns raw
 *    `/object/sign/...` URLs, which serve the full-resolution original
 *    (up to 8 MB). Appending `?width=` to those URLs is ignored by the
 *    server. Large baseline JPEGs paint top-to-bottom while they download,
 *    which is the "image slowly revealing itself" effect. So every image is
 *    now signed individually with a `transform`, which makes the server
 *    return a `/render/image/sign/...` URL for a resized, re-compressed copy.
 *
 * 2. A freshly minted signed URL is a *different URL* every time (new
 *    token), so re-signing on every settings/query refetch defeated the
 *    browser cache and remounted <img> elements. Signed URLs are now cached
 *    per path + size for most of their lifetime, so the same image keeps the
 *    same URL for the whole session.
 *
 * 3. The upload path stores a signed URL in the database. `extractPath`
 *    must recognise *render* URLs too, otherwise an uploaded image is never
 *    re-signed and silently breaks when its 7-day token expires.
 */

const BUCKET = "media";

export function extractPath(stored: string | null): string | null {
  if (!stored) return null;
  const s = stored.trim();
  if (!s) return null;
  const m = s.match(/\/(?:object|render\/image)\/(?:public|sign|authenticated)\/media\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (
    !/^https?:\/\//i.test(s) &&
    !s.startsWith("/") &&
    !s.startsWith("data:") &&
    !s.startsWith("blob:")
  ) {
    return s.replace(/^\/+/, "");
  }
  return null;
}

const SIGN_TTL = 60 * 60 * 24 * 7;
/** Reuse a cached signed URL for up to 6 days of its 7-day life. */
const CACHE_MS = 6 * 24 * 60 * 60 * 1000;

export type Transform = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

/** Size presets by where an image is shown. Photos are uploaded at full
 * resolution but are never displayed that large. Widths include ~2x for
 * high-density screens at the sizes the layout actually renders. */
export const IMG = {
  hero: { width: 1600, quality: 76 },
  full: { width: 1280, quality: 75 },
  card: { width: 720, quality: 72 },
  thumb: { width: 560, quality: 70 },
  avatar: { width: 480, quality: 74 },
  logo: { width: 360, quality: 80 },
  banner: { width: 1600, quality: 78 },
} as const satisfies Record<string, Transform>;

const DEFAULT_TRANSFORM: Transform = IMG.full;

type CacheEntry = { promise: Promise<string | null>; at: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(path: string, t: Transform) {
  return `${path}|${t.width ?? ""}|${t.height ?? ""}|${t.quality ?? ""}|${t.resize ?? ""}`;
}

async function signOne(path: string, transform: Transform): Promise<string | null> {
  const withTransform = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL, { transform });
  if (!withTransform.error && withTransform.data) return withTransform.data.signedUrl;
  // Transform rejected at signing time — fall back to the original file.
  const plain = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  if (!plain.error && plain.data) return plain.data.signedUrl;
  return null;
}

function signCached(path: string, transform: Transform): Promise<string | null> {
  const key = cacheKey(path, transform);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = signOne(path, transform).then((url) => {
    // Don't keep failures around — let the next call retry.
    if (!url && cache.get(key)?.promise === promise) cache.delete(key);
    return url;
  });
  cache.set(key, { promise, at: Date.now() });
  return promise;
}

export async function signMediaUrl(
  stored: string | null,
  transform: Transform = DEFAULT_TRANSFORM,
): Promise<string | null> {
  const path = extractPath(stored);
  if (!path) return stored;
  return (await signCached(path, transform)) ?? stored;
}

export async function signMediaUrlsBatch(
  stored: (string | null)[],
  transform: Transform = DEFAULT_TRANSFORM,
): Promise<(string | null)[]> {
  const paths = stored.map(extractPath);
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (uniquePaths.length === 0) return stored;
  const entries = await Promise.all(
    uniquePaths.map(async (p) => [p, await signCached(p, transform)] as const),
  );
  const map = new Map(entries);
  return paths.map((p, i) => (p && map.get(p)) || stored[i]);
}

export async function resolveField<T>(
  rows: T[],
  key: keyof T,
  transform?: Transform,
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const signed = await signMediaUrlsBatch(
    rows.map((r) => (r[key] as string | null | undefined) ?? null),
    transform,
  );
  return rows.map((row, i) => ({ ...row, [key]: signed[i] }));
}

/** The un-resized original for a transformed signed URL (used as a one-shot
 * fallback if the image-transform endpoint is unavailable). Returns null if
 * the URL is not a render URL. */
export function originalFromRenderUrl(url: string): string | null {
  if (!url.includes("/render/image/sign/")) return null;
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace("/render/image/sign/", "/object/sign/");
    return u.toString();
  } catch {
    return null;
  }
}
