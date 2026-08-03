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

export async function signMediaUrl(stored: string | null): Promise<string | null> {
  const path = extractPath(stored);
  if (!path) return stored;
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, SIGN_TTL);
  if (error || !data) return stored;
  return data.signedUrl;
}

export async function signMediaUrlsBatch(stored: (string | null)[]): Promise<(string | null)[]> {
  const paths = stored.map(extractPath);
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (uniquePaths.length === 0) return stored;
  const { data, error } = await supabase.storage.from("media").createSignedUrls(uniquePaths, SIGN_TTL);
  if (error || !data) return stored;
  const map = new Map<string, string>();
  data.forEach((d, i) => {
    if (d.signedUrl) map.set(uniquePaths[i], d.signedUrl);
  });
  return paths.map((p, i) => (p && map.get(p)) || stored[i]);
}

export async function resolveField<T>(rows: T[], key: keyof T): Promise<T[]> {
  if (rows.length === 0) return rows;
  const signed = await signMediaUrlsBatch(rows.map((r) => ((r as any)[key] as string | null) ?? null));
  const out = new Array<T>(rows.length);
  for (let i = 0; i < rows.length; i++) out[i] = { ...(rows[i] as any), [key]: signed[i] } as T;
  return out;
}
