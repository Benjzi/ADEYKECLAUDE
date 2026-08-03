import { supabase } from "@/integrations/supabase/client";
import { resolveField } from "./media-url";

export type NewsListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
};
export type NewsArticle = NewsListItem & { body: string; updated_at: string };

export type EventListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  rsvp_url: string | null;
  published_at: string | null;
};
export type EventDetail = EventListItem & { body: string; updated_at: string };

export type GalleryCategoryPublic = { id: string; name: string; slug: string; description: string | null; cover_image_url: string | null; event_id: string | null };
export type GalleryItemPublic = {
  id: string;
  title: string | null;
  caption: string | null;
  image_url: string;
  category_id: string | null;
};
export type StaffPublic = {
  id: string;
  full_name: string;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
};
export type PartnerPublic = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
};

const nowIso = () => new Date().toISOString();

export async function listPublishedNews(): Promise<NewsListItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select("id, title, slug, excerpt, cover_image_url, category, tags, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", nowIso())
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return resolveField((data ?? []) as NewsListItem[], "cover_image_url");
}

export async function getPublishedNews({ data }: { data: { slug: string } }): Promise<NewsArticle | null> {
  const { data: row, error } = await supabase
    .from("news")
    .select("id, title, slug, excerpt, body, cover_image_url, category, tags, published_at, updated_at")
    .eq("slug", data.slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", nowIso())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const [resolved] = await resolveField([row as NewsArticle], "cover_image_url");
  return resolved;
}

export async function listPublishedEvents(): Promise<EventListItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, description, cover_image_url, location, starts_at, ends_at, rsvp_url, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", nowIso())
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return resolveField((data ?? []) as EventListItem[], "cover_image_url");
}

export async function getPublishedEvent({ data }: { data: { slug: string } }): Promise<EventDetail | null> {
  const { data: row, error } = await supabase
    .from("events")
    .select("id, title, slug, description, body, cover_image_url, location, starts_at, ends_at, rsvp_url, published_at, updated_at")
    .eq("slug", data.slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", nowIso())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const [resolved] = await resolveField([row as EventDetail], "cover_image_url");
  return resolved;
}

export async function listEventGalleryAlbums(eventId: string): Promise<{ categories: GalleryCategoryPublic[]; items: GalleryItemPublic[] }> {
  const c = await supabase
    .from("gallery_categories")
    .select("id, name, slug, description, cover_image_url, event_id")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (c.error) throw new Error(c.error.message);
  const catIds = (c.data ?? []).map((row: any) => row.id);
  if (catIds.length === 0) return { categories: [], items: [] };
  const i = await supabase
    .from("gallery_items")
    .select("id, title, caption, image_url, category_id")
    .in("category_id", catIds)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (i.error) throw new Error(i.error.message);
  const items = await resolveField((i.data ?? []) as GalleryItemPublic[], "image_url");
  const categories = await resolveField((c.data ?? []) as GalleryCategoryPublic[], "cover_image_url");
  return { categories, items };
}

export async function listPublicGallery(): Promise<{ categories: GalleryCategoryPublic[]; items: GalleryItemPublic[] }> {
  const [c, i] = await Promise.all([
    supabase.from("gallery_categories").select("id, name, slug, description, cover_image_url, event_id").order("sort_order", { ascending: true }),
    supabase
      .from("gallery_items")
      .select("id, title, caption, image_url, category_id")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);
  if (c.error) throw new Error(c.error.message);
  if (i.error) throw new Error(i.error.message);
  const items = await resolveField((i.data ?? []) as GalleryItemPublic[], "image_url");
  const categories = await resolveField((c.data ?? []) as GalleryCategoryPublic[], "cover_image_url");
  return { categories, items };
}

export async function listPublicStaff(): Promise<StaffPublic[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, role_title, bio, photo_url")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return resolveField((data ?? []) as StaffPublic[], "photo_url");
}

export async function listPublicPartners(): Promise<PartnerPublic[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("id, name, logo_url, website_url")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return resolveField((data ?? []) as PartnerPublic[], "logo_url");
}

// -------- Contact --------
export async function submitContactMessage({ data }: {
  data: { name: string; email: string; message: string; subject?: string | null };
}): Promise<{ ok: true }> {
  // contact_messages is added by migration; cast to bypass stale generated types.
  const { error } = await (supabase.from as any)("contact_messages").insert({
    name: data.name,
    email: data.email,
    subject: data.subject ?? null,
    message: data.message,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}
