import { supabase } from "@/integrations/supabase/client";
import { resolveField, signMediaUrl } from "./media-url";

export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  banned: boolean;
};

// -------- Me / roles --------
export async function getMyRoles() {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return { userId: "", roles: [] as string[], isAdmin: false, isEditor: false };
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  return { userId: user.id, roles, isAdmin: roles.includes("admin"), isEditor: roles.includes("editor") };
}

// -------- Dashboard --------
export async function getAdminStats() {
  const nowIsoStr = new Date().toISOString();
  const [published, drafts, upcoming, pastEvents, galleryCount, staffCount, partnersCount, unread] = await Promise.all([
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published").gte("starts_at", nowIsoStr),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published").lt("starts_at", nowIsoStr),
    supabase.from("gallery_items").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "published"),
    (supabase.from as any)("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
  ]);
  return {
    newsPublished: published.count ?? 0,
    newsDrafts: drafts.count ?? 0,
    eventsUpcoming: upcoming.count ?? 0,
    eventsPast: pastEvents.count ?? 0,
    gallery: galleryCount.count ?? 0,
    staff: staffCount.count ?? 0,
    partners: partnersCount.count ?? 0,
    messagesUnread: unread.count ?? 0,
  };
}

// -------- News --------
export async function listAllNews() {
  const { data, error } = await supabase
    .from("news")
    .select("id, title, slug, status, category, cover_image_url, published_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return resolveField(data ?? [], "cover_image_url");
}
export async function getNewsById({ data }: { data: { id: string } }) {
  const { data: row, error } = await supabase.from("news").select("*").eq("id", data.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  (row as any).cover_image_url = await signMediaUrl((row as any).cover_image_url ?? null);
  return row;
}
export async function saveNews({ data }: { data: any }) {
  const payload = {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt ?? null,
    body: data.body ?? "",
    cover_image_url: data.cover_image_url ?? null,
    category: data.category ?? null,
    tags: data.tags ?? [],
    status: data.status,
    published_at:
      data.status === "published"
        ? data.published_at ?? new Date().toISOString()
        : data.published_at ?? null,
  };
  if (data.id) {
    const { data: row, error } = await supabase.from("news").update(payload).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  }
  const { data: row, error } = await supabase.from("news").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return row;
}
export async function deleteNews({ data }: { data: { id: string } }) {
  const { error } = await supabase.from("news").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -------- Events --------
export async function listAllEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, status, starts_at, ends_at, location, cover_image_url, published_at, updated_at")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return resolveField(data ?? [], "cover_image_url");
}
export async function getEventById({ data }: { data: { id: string } }) {
  const { data: row, error } = await supabase.from("events").select("*").eq("id", data.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  (row as any).cover_image_url = await signMediaUrl((row as any).cover_image_url ?? null);
  return row;
}
export async function saveEvent({ data }: { data: any }) {
  const payload = {
    title: data.title,
    slug: data.slug,
    description: data.description ?? null,
    body: data.body ?? "",
    cover_image_url: data.cover_image_url ?? null,
    location: data.location ?? null,
    starts_at: data.starts_at,
    ends_at: data.ends_at ?? null,
    rsvp_url: data.rsvp_url ?? null,
    status: data.status,
    published_at:
      data.status === "published"
        ? data.published_at ?? new Date().toISOString()
        : data.published_at ?? null,
  };
  if (data.id) {
    const { data: row, error } = await supabase.from("events").update(payload).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  }
  const { data: row, error } = await supabase.from("events").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return row;
}
export async function deleteEvent({ data }: { data: { id: string } }) {
  const { error } = await supabase.from("events").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -------- Media upload (direct browser -> Storage, RLS enforced) --------
export async function uploadMedia({ data }: {
  data: {
    folder: "news" | "events" | "gallery" | "staff" | "partners" | "settings";
    filename: string;
    contentType: string;
    base64: string;
  };
}) {
  const ext = data.filename.split(".").pop() ?? "bin";
  const path = `${data.folder}/${crypto.randomUUID()}.${ext.toLowerCase()}`;
  const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  const { error } = await supabase.storage.from("media").upload(path, bytes, {
    contentType: data.contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const url = await signMediaUrl(path);
  return { path, url: url ?? path };
}

// -------- Gallery categories --------
export async function listGalleryCategories() {
  const { data, error } = await (supabase.from as any)("gallery_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
export async function saveGalleryCategory({ data }: { data: any }) {
  const payload: any = {
    name: data.name,
    slug: data.slug,
    sort_order: data.sort_order,
    description: data.description ?? null,
    cover_image_url: data.cover_image_url ?? null,
    event_id: data.event_id ?? null,
    news_id: data.news_id ?? null,
  };
  if (data.id) {
    const { data: row, error } = await (supabase.from as any)("gallery_categories")
      .update(payload)
      .eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  }
  const { data: code } = await (supabase.rpc as any)("next_album_code");
  payload.album_code = code ?? null;
  const { data: row, error } = await (supabase.from as any)("gallery_categories")
    .insert(payload)
    .select().single();
  if (error) throw new Error(error.message);
  return row;
}
export async function deleteGalleryCategory({ data }: { data: { id: string } }) {
  const { error } = await supabase.from("gallery_categories").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -------- Gallery items --------
export async function listAllGallery() {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, title, caption, image_url, category_id, sort_order, status, published_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return resolveField(data ?? [], "image_url");
}
export async function saveGalleryItem({ data }: { data: any }) {
  const payload = {
    title: data.title ?? null,
    caption: data.caption ?? null,
    image_url: data.image_url,
    category_id: data.category_id ?? null,
    sort_order: data.sort_order ?? 0,
    status: data.status,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };
  if (data.id) {
    const { data: row, error } = await supabase.from("gallery_items").update(payload).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  }
  const { data: row, error } = await supabase.from("gallery_items").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return row;
}
export async function deleteGalleryItem({ data }: { data: { id: string } }) {
  const { error } = await supabase.from("gallery_items").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
export async function reorderGallery({ data }: { data: { orders: { id: string; sort_order: number }[] } }) {
  for (const o of data.orders) {
    const { error } = await supabase.from("gallery_items").update({ sort_order: o.sort_order }).eq("id", o.id);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

// -------- Staff --------
export async function listAllStaff() {
  const { data, error } = await supabase.from("staff").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return resolveField(data ?? [], "photo_url");
}
export async function saveStaff({ data }: { data: any }) {
  const payload = {
    full_name: data.full_name,
    role_title: data.role_title ?? null,
    bio: data.bio ?? null,
    photo_url: data.photo_url ?? null,
    email: data.email || null,
    phone: data.phone ?? null,
    sort_order: data.sort_order ?? 0,
    status: data.status,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };
  if (data.id) {
    const { data: row, error } = await supabase.from("staff").update(payload).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  }
  const { data: row, error } = await supabase.from("staff").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return row;
}
export async function deleteStaff({ data }: { data: { id: string } }) {
  const { error } = await supabase.from("staff").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -------- Partners --------
export async function listAllPartners() {
  const { data, error } = await supabase.from("partners").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return resolveField(data ?? [], "logo_url");
}
export async function savePartner({ data }: { data: any }) {
  const payload = {
    name: data.name,
    logo_url: data.logo_url ?? null,
    website_url: data.website_url || null,
    sort_order: data.sort_order ?? 0,
    status: data.status,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };
  if (data.id) {
    const { data: row, error } = await supabase.from("partners").update(payload).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  }
  const { data: row, error } = await supabase.from("partners").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return row;
}
export type DonationRow = {
  id: string;
  tx_ref: string;
  amount: string;
  currency: string;
  donor_name: string | null;
  donor_email: string | null;
  message: string | null;
  status: "pending" | "success" | "failed" | "cancelled";
  chapa_reference: string | null;
  created_at: string;
};

// -------- Donations (read-only registry) --------
export async function listAllDonations(): Promise<DonationRow[]> {
  const { data, error } = await supabase
    .from("donations")
    .select("id, tx_ref, amount, currency, donor_name, donor_email, message, status, chapa_reference, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DonationRow[];
}

export async function deletePartner({ data }: { data: { id: string } }) {
  const { error } = await supabase.from("partners").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -------- Users & Roles (admin only, via Edge Function) --------
export async function listUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase.functions.invoke<UserRow[]>("admin-users", { body: { action: "list" } });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function setUserRoles({ data }: { data: { userId: string; roles: ("admin" | "editor")[] } }) {
  const { error } = await supabase.functions.invoke("admin-users", { body: { action: "set_roles", ...data } });
  if (error) throw new Error(error.message);
  return { ok: true };
}
export async function inviteUser({ data }: {
  data: { email: string; password: string; roles: ("admin" | "editor")[]; fullName?: string };
}) {
  const { data: res, error } = await supabase.functions.invoke<{ ok: true; userId: string }>("admin-users", {
    body: { action: "invite", ...data },
  });
  if (error) throw new Error(error.message);
  return res!;
}
export async function deleteUser({ data }: { data: { userId: string } }) {
  const { error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", ...data } });
  if (error) throw new Error(error.message);
  return { ok: true };
}
export async function setUserBanned({ data }: { data: { userId: string; banned: boolean } }) {
  const { error } = await supabase.functions.invoke("admin-users", { body: { action: "set_banned", ...data } });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -------- Contact inbox --------
export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};
export async function listContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await (supabase.from as any)("contact_messages")
    .select("id, name, email, subject, message, is_read, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
}
export async function markMessageRead({ data }: { data: { id: string; is_read: boolean } }) {
  const { error } = await (supabase.from as any)("contact_messages").update({ is_read: data.is_read }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
export async function deleteContactMessage({ data }: { data: { id: string } }) {
  const { error } = await (supabase.from as any)("contact_messages").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
