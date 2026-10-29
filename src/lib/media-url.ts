import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves stored media references to image URLs.
 *
 * TWO MODES
 *
 * 1. PUBLIC (default, fastest). Site images are served from stable public
 *    URLs (`/storage/v1/render/image/public/media/<path>?width=…`). They
 *    need no signing round-trip, never expire, and — crucially — every
 *    visitor gets the SAME URL, so Supabase's CDN keeps a warm copy at the
 *    edge near the visitor and the browser can cache it across visits.
 *    Requires the `media` bucket to be public (see the migration
 *    20261029000000_public_media_bucket.sql).
 *
 * 2. SIGNED (automatic fallback). If public URLs fail (bucket still
 *    private), the app learns that and uses signed URLs instead. Every signed
 *    URL carries a unique token, so the CDN can't share a cached copy between
 *    visitors — this is the slow path, kept only so nothing ever breaks.
 *
 * Other things this file takes care of:
 *  - Resizing only works if the request asks for it (signed: pass a
 *    `transform` when signing; public: query params). Batch
 *    `createSignedUrls` can't resize and serves the multi-MB original.
 *  - URLs are stable for a session (signed ones are cached per path+size) so
 *    the browser cache is hit and <img> elements aren't remounted.
 *  - `extractPath` understands every URL form we've ever stored (object /
 *    render, public / sign), so old rows keep working and get re-resolved.
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
// Few distinct sizes on purpose: every new (path, width, quality) combination
// is rendered on demand the first time it's requested, then CDN-cached.
const LARGE: Transform = { width: 1600, quality: 75 };
export const IMG = {
  hero: LARGE,
  full: LARGE,
  banner: LARGE,
  card: { width: 720, quality: 72 },
  thumb: { width: 720, quality: 72 },
  avatar: { width: 480, quality: 74 },
  logo: { width: 360, quality: 80 },
} as const satisfies Record<string, Transform>;

const DEFAULT_TRANSFORM: Transform = IMG.full;

/** Learned, remembered "this doesn't work here" flags. Two distinct
 * failures flip a flag; it is remembered across visits for a while (so
 * returning visitors never pay the failed attempts), then re-tested.
 *
 * Build-time overrides:
 *   VITE_IMAGE_TRANSFORMS = "off" | "on"   (never / always try resized images)
 *   VITE_MEDIA_PUBLIC     = "off" | "on"   (never / always use public URLs)
 */
const FORCED_TRANSFORMS = import.meta.env.VITE_IMAGE_TRANSFORMS as string | undefined;
const FORCED_PUBLIC = import.meta.env.VITE_MEDIA_PUBLIC as string | undefined;

function learnedFlag(key: string, ttlMs: number): boolean {
  try {
    const at = Number(localStorage.getItem(key));
    return Number.isFinite(at) && at > 0 && Date.now() - at < ttlMs;
  } catch {
    return false;
  }
}
function rememberFlag(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

const TRANSFORMS_KEY = "adeycp-img-transform-off";
const PUBLIC_KEY = "adeycp-media-public-off";
let transformsOff =
  FORCED_TRANSFORMS === "off" ||
  (FORCED_TRANSFORMS !== "on" && learnedFlag(TRANSFORMS_KEY, 6 * 60 * 60 * 1000));
// Shorter memory for the public flag so a bucket that has just been made
// public is picked up quickly.
let publicOff =
  FORCED_PUBLIC === "off" || (FORCED_PUBLIC !== "on" && learnedFlag(PUBLIC_KEY, 20 * 60 * 1000));

const failedRenders = new Set<string>();
const failedPublic = new Set<string>();

export function reportRenderFailure(url: string) {
  failedRenders.add(url.split("?")[0]);
  if (failedRenders.size >= 2 && !transformsOff && FORCED_TRANSFORMS !== "on") {
    transformsOff = true;
    rememberFlag(TRANSFORMS_KEY);
    cache.clear();
  }
}

export function reportPublicFailure(url: string) {
  failedPublic.add(url.split("?")[0]);
  if (failedPublic.size >= 2 && !publicOff && FORCED_PUBLIC !== "on") {
    publicOff = true;
    rememberFlag(PUBLIC_KEY);
    cache.clear();
  }
}

/** Which URL form is currently in use (cached data is only reused for the
 * same form, so a stale public URL is never replayed in signed mode). */
export function mediaMode(): "public" | "signed" {
  return publicOff ? "signed" : "public";
}

/** Stable, CDN-cacheable public URL (no network call). */
function publicUrl(path: string, transform: Transform): string {
  const useResize = !transformsOff && !!transform.width;
  return supabase.storage.from(BUCKET).getPublicUrl(path, useResize ? { transform } : undefined)
    .data.publicUrl;
}

type CacheEntry = { promise: Promise<string | null>; at: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(path: string, t: Transform) {
  return `${path}|${t.width ?? ""}|${t.height ?? ""}|${t.quality ?? ""}|${t.resize ?? ""}`;
}

async function signOne(path: string, transform: Transform): Promise<string | null> {
  if (transformsOff || Object.keys(transform).length === 0) {
    const plain = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
    return !plain.error && plain.data ? plain.data.signedUrl : null;
  }
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

/** Resolve one path to a URL: instant public URL, or a signed one. */
function resolvePath(path: string, transform: Transform): Promise<string | null> | string {
  return publicOff ? signCached(path, transform) : publicUrl(path, transform);
}

export async function signMediaUrl(
  stored: string | null,
  transform: Transform = DEFAULT_TRANSFORM,
): Promise<string | null> {
  const path = extractPath(stored);
  if (!path) return stored;
  return (await resolvePath(path, transform)) ?? stored;
}

export async function signMediaUrlsBatch(
  stored: (string | null)[],
  transform: Transform = DEFAULT_TRANSFORM,
): Promise<(string | null)[]> {
  const paths = stored.map(extractPath);
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (uniquePaths.length === 0) return stored;
  const entries = await Promise.all(
    uniquePaths.map(async (p) => [p, await resolvePath(p, transform)] as const),
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

export type UrlKind = "public" | "signed-render" | "plain";

export function classifyUrl(url: string): UrlKind {
  if (/\/(?:object|render\/image)\/public\//.test(url)) return "public";
  if (url.includes("/render/image/")) return "signed-render";
  return "plain";
}

/** A freshly signed URL for the un-resized original of an image. */
export async function signOriginal(stored: string): Promise<string | null> {
  const path = extractPath(stored);
  if (!path) return null;
  return signCached(path, {});
}

/** Is the public (un-resized) file reachable? Distinguishes "the bucket isn't
 * public" from "the bucket is public but resizing isn't available". */
async function publicFileReachable(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    window.clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/** Next thing to try after `failedUrl` failed to load, or null if there is
 * nothing better.
 *   public resized → public original (if the bucket is public: resizing is
 *                    what's unavailable) → signed resized (bucket is private)
 *   public original → signed original
 *   signed resized  → signed original */
export async function recoverUrl(failedUrl: string): Promise<string | null> {
  const kind = classifyUrl(failedUrl);
  const path = extractPath(failedUrl);
  if (!path) return null;
  if (kind === "public") {
    const q = new URL(failedUrl).searchParams;
    const width = Number(q.get("width")) || undefined;
    const quality = Number(q.get("quality")) || undefined;
    if (failedUrl.includes("/render/image/")) {
      const original = publicUrl(path, {}); // `{}` → plain /object/public URL
      if (await publicFileReachable(original)) {
        reportRenderFailure(failedUrl); // bucket is public → resizing is the problem
        return original;
      }
      reportPublicFailure(failedUrl); // bucket is private → use signed URLs
      return signCached(path, width ? { width, quality } : {});
    }
    reportPublicFailure(failedUrl);
    return signCached(path, {});
  }
  if (kind === "signed-render") {
    reportRenderFailure(failedUrl);
    return signCached(path, {});
  }
  return null;
}

/** Responsive candidates for a public resized URL, so phones don't download
 * desktop-sized images. Returns undefined if `url` isn't a resizable URL. */
export function responsiveSrcSet(url: string): string | undefined {
  if (classifyUrl(url) !== "public" || !url.includes("/render/image/")) return undefined;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const max = Number(u.searchParams.get("width"));
  if (!max) return undefined;
  const widths = Array.from(new Set([480, 800, 1200, 1600].filter((w) => w < max).concat(max)));
  if (widths.length < 2) return undefined;
  return widths
    .map((w) => {
      u.searchParams.set("width", String(w));
      return `${u.toString()} ${w}w`;
    })
    .join(", ");
}
