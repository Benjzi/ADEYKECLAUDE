import { useQuery, useQueryClient, useMutation, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  org_name: string;
  short_description: string | null;
  long_description: string | null;
  mission: string | null;
  vision: string | null;

  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  maps_url: string | null;
  office_hours: string | null;

  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_telegram_forum: string | null;
  social_telegram_channel: string | null;
  social_linkedin: string | null;

  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  footer_logo_url: string | null;

  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;

  stat_children_supported: string | null;
  stat_years_of_impact: string | null;
  stat_partner_clinics: string | null;
  stat_volunteers_staff: string | null;

  hero_heading: string | null;
  hero_subtext: string | null;
  cta_heading: string | null;
  cta_subtext: string | null;
  footer_text: string | null;
  copyright_text: string | null;
  donation_info: string | null;

  theme_color: string | null;
  impact_stats: { n: string; l: string }[];
  by_numbers_stats: { n: string; l: string }[];

  hero_slideshow: string[];
  theme_mode: "brand" | "custom";
  goals: string | null;

  founder_name: string | null;
  founder_title: string | null;
  founder_bio: string | null;
  founder_quote: string | null;
  founder_photo_url: string | null;

  testimony_mother_name: string | null;
  testimony_photo_url: string | null;
  testimony_quote: string | null;
  testimony_points: string[];

  membership_form_url: string | null;
};

/**
 * Used only as a zero-flicker placeholder before the real row loads, and as
 * a safety net if any field is left blank in the admin. Never shown as the
 * "final" value if the settings row has real content.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  org_name: "Adey CP Humanitarian Association",
  short_description: "Walking alongside children with Cerebral Palsy and their families across Ethiopia.",
  long_description: null,
  mission: null,
  vision: null,
  phone_primary: null,
  phone_secondary: null,
  email: null,
  address: null,
  maps_url: null,
  office_hours: null,
  social_facebook: null,
  social_instagram: null,
  social_tiktok: null,
  social_youtube: "@adeycerebralpalsy",
  social_telegram_forum: null,
  social_telegram_channel: null,
  social_linkedin: null,
  logo_url: null,
  favicon_url: null,
  hero_image_url: null,
  footer_logo_url: null,
  seo_title: "Adey CP Humanitarian Association — Every Child Deserves to Thrive",
  seo_description: "We walk alongside children with Cerebral Palsy and their families across Ethiopia.",
  seo_keywords: null,
  stat_children_supported: "1,200+",
  stat_years_of_impact: "9 Years",
  stat_partner_clinics: "14",
  stat_volunteers_staff: "40+",
  hero_heading: "Every Child Deserves to Thrive",
  hero_subtext: "We walk alongside children with Cerebral Palsy and their families across Ethiopia — providing therapy, dignity, community, and a future full of possibility.",
  cta_heading: "Be part of a child's next chapter.",
  cta_subtext: "Your gift funds therapy, learning materials, and family support that change lives — every birr, dollar and euro reaches a child.",
  footer_text: "Adey CP Humanitarian Association walks alongside children with Cerebral Palsy and their families across Ethiopia.",
  copyright_text: `© ${new Date().getFullYear()} Adey CP Humanitarian Association. All rights reserved.`,
  donation_info: null,

  theme_color: null,
  impact_stats: [
    { n: "94%", l: "of children show measurable progress within 12 months" },
    { n: "6", l: "regions reached across Ethiopia" },
    { n: "3.5k", l: "therapy sessions delivered in 2025" },
    { n: "100%", l: "of donations directly fund programs" },
  ],
  by_numbers_stats: [
    { n: "1,000+", l: "Children served annually" },
    { n: "10", l: "Years of service" },
    { n: "12", l: "Regions reached" },
    { n: "40+", l: "Trained caregivers & therapists" },
  ],

  hero_slideshow: [],
  theme_mode: "brand",
  goals: null,

  founder_name: null,
  founder_title: "Founder & Executive Director",
  founder_bio: null,
  founder_quote: null,
  founder_photo_url: null,

  testimony_mother_name: null,
  testimony_photo_url: null,
  testimony_quote: null,
  testimony_points: [],

  membership_form_url: null,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await (supabase.from as any)("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...data };
}

export const siteSettingsQuery = queryOptions({
  queryKey: ["public", "site-settings"],
  queryFn: getSiteSettings,
  staleTime: 60_000,
});

/** Non-suspense hook: always returns a usable object immediately (defaults
 * while loading), then swaps in the real row once fetched. Safe to use in
 * Navbar/Footer without wrapping every page in a suspense boundary. */
export function useSiteSettings(): SiteSettings {
  const { data } = useQuery({ ...siteSettingsQuery, placeholderData: DEFAULT_SETTINGS });
  return data ?? DEFAULT_SETTINGS;
}

const SOCIAL_BASE: Record<string, string> = {
  facebook: "https://facebook.com/",
  instagram: "https://instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://youtube.com/",
  telegram_forum: "https://t.me/",
  telegram_channel: "https://t.me/",
  linkedin: "https://www.linkedin.com/company/",
};

/** Accepts either a full URL or a bare "@handle"/"handle" and returns a
 * clickable link. Lets admins paste either format into Website Settings. */
export function socialHref(kind: keyof typeof SOCIAL_BASE, value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  if (kind === "youtube" && !handle.startsWith("channel/")) return `${SOCIAL_BASE.youtube}@${handle}`;
  return `${SOCIAL_BASE[kind]}${handle}`;
}

// -------- Theme color application --------
// The site's color system (src/styles.css) is built on OKLCH custom
// properties, but browsers accept any valid CSS color for a custom
// property, so we can safely override with hsl() computed at runtime.
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.trim().replace("#", "");
  if (!/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(m)) return null;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Applies a hex color as the site's primary brand color by overriding the
 * relevant CSS custom properties on <html>. Pass null to reset to defaults
 * (removes the inline overrides so the stylesheet's own values apply). */
export function applyThemeColor(hex: string | null | undefined) {
  const root = document.documentElement;
  const vars = ["--primary", "--primary-dark", "--primary-soft", "--ring", "--sidebar-primary", "--sidebar-ring"];
  if (!hex) {
    vars.forEach((v) => root.style.removeProperty(v));
    return;
  }
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const { h, s } = hsl;
  root.style.setProperty("--primary", `hsl(${h} ${s}% 48%)`);
  root.style.setProperty("--primary-dark", `hsl(${h} ${s}% ${clamp(48 - 12, 8, 90)}%)`);
  root.style.setProperty("--primary-soft", `hsl(${h} ${clamp(s * 0.4, 10, 60)}% 95%)`);
  root.style.setProperty("--ring", `hsl(${h} ${s}% 48%)`);
  root.style.setProperty("--sidebar-primary", `hsl(${h} ${s}% 48%)`);
  root.style.setProperty("--sidebar-ring", `hsl(${h} ${s}% 48%)`);
}

/** Applies the full theme decision: 'brand' resets to the stylesheet's navy
 * + gold defaults; 'custom' applies the admin's chosen color. */
export function applyThemeMode(mode: "brand" | "custom", customColor: string | null | undefined) {
  if (mode === "custom" && customColor) applyThemeColor(customColor);
  else applyThemeColor(null);
}

/** 15 curated preset swatches for the admin color picker. */
export const THEME_PRESETS: { name: string; hex: string }[] = [
  { name: "Ocean Blue", hex: "#2b7fbf" },
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Emerald", hex: "#059669" },
  { name: "Forest", hex: "#15803d" },
  { name: "Lime", hex: "#65a30d" },
  { name: "Amber", hex: "#d97706" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Terracotta", hex: "#c2410c" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Crimson", hex: "#be123c" },
  { name: "Magenta", hex: "#c026d3" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Slate", hex: "#475569" },
];

export async function updateSiteSettings(patch: Partial<SiteSettings>) {
  const { error } = await (supabase.from as any)("site_settings").update(patch).eq("id", 1);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<SiteSettings>) => updateSiteSettings(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public", "site-settings"] }),
  });
}
