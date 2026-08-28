import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { siteSettingsQuery, useUpdateSiteSettings, applyThemeColor, applyThemeMode, THEME_PRESETS, type SiteSettings } from "@/lib/site-settings";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { useMembershipCount } from "@/lib/membership";

export const Route = createFileRoute("/_authenticated/aleka/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  component: SettingsAdmin,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StatList({
  items, onChange,
}: {
  items: { n: string; l: string }[];
  onChange: (items: { n: string; l: string }[]) => void;
}) {
  function update(i: number, patch: Partial<{ n: string; l: string }>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <Label className="text-xs text-muted-foreground">Number / value</Label>
          <Input className="mt-1" value={it.n} onChange={(e) => update(i, { n: e.target.value })} placeholder="e.g. 94%" />
          <Label className="mt-3 block text-xs text-muted-foreground">Caption</Label>
          <Textarea className="mt-1" rows={2} value={it.l} onChange={(e) => update(i, { l: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

function StringListEditor({
  items, onChange, placeholder = "Add an item…",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={it} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))} />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>Remove</Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}>Add</Button>
      </div>
    </div>
  );
}

function ImageListEditor({ images, onChange, max = 8 }: { images: string[]; onChange: (imgs: string[]) => void; max?: number }) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {images.map((url, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl border border-border">
            <img src={url} alt="" className="aspect-video w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">#{i + 1}</span>
            <div className="absolute right-2 top-2 flex gap-1">
              <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
              <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" disabled={i === images.length - 1} onClick={() => move(i, 1)}>↓</Button>
            </div>
            <Button
              type="button" size="sm" variant="destructive"
              className="absolute bottom-2 right-2 h-7 px-2 text-xs"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
            >Remove</Button>
          </div>
        ))}
      </div>
      {images.length < max ? (
        <MediaUpload folder="settings" value={null} onChange={(url) => url && onChange([...images, url])} />
      ) : (
        <p className="text-xs text-muted-foreground">Maximum {max} slideshow photos — remove one to add another.</p>
      )}
    </div>
  );
}

function SettingsAdmin() {
  const { data } = useSuspenseQuery(siteSettingsQuery);
  const [form, setForm] = useState<SiteSettings>(data);
  const mut = useUpdateSiteSettings();
  const { data: registeredCount } = useMembershipCount();
  const liveRegistered = registeredCount ?? 0;
  const currentTotal = form.membership_total_offset + liveRegistered;

  // keep local form in sync if the row changes underneath us (e.g. another admin saved)
  useEffect(() => setForm(data), [data]);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    mut.mutate(form, {
      onSuccess: () => toast.success("Website settings saved — changes are live everywhere."),
      onError: (e: any) => toast.error(e.message ?? "Could not save settings"),
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Website Settings</h2>
          <p className="text-sm text-muted-foreground">
            The central control panel — every page on the site reads these values automatically.
          </p>
        </div>
        <Button onClick={save} disabled={mut.isPending}>
          <Save className="mr-2 h-4 w-4" /> {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <Tabs defaultValue="slider" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="slider">Homepage Slider</TabsTrigger>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="theme">Theme Color</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="story">Founder &amp; Story</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
        </TabsList>

        <TabsContent value="slider" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-ink">Homepage Photo Slider</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These are the photos that slide across the top of your homepage. Upload your own anytime —
              use the arrows to reorder them, or remove ones you don't want anymore. Up to 8 photos.
            </p>
          </div>
          <ImageListEditor images={form.hero_slideshow} onChange={(imgs) => set("hero_slideshow", imgs)} max={8} />
        </TabsContent>

        <TabsContent value="org" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <Field label="Organization name">
            <Input value={form.org_name} onChange={(e) => set("org_name", e.target.value)} />
          </Field>
          <Field label="Short description">
            <Textarea rows={2} value={form.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
          </Field>
          <Field label="Long description (used on the homepage About section)">
            <Textarea rows={4} value={form.long_description ?? ""} onChange={(e) => set("long_description", e.target.value)} />
          </Field>
          <Field label="Mission">
            <Textarea rows={3} value={form.mission ?? ""} onChange={(e) => set("mission", e.target.value)} />
          </Field>
          <Field label="Vision">
            <Textarea rows={3} value={form.vision ?? ""} onChange={(e) => set("vision", e.target.value)} />
          </Field>
        </TabsContent>

        <TabsContent value="contact" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary phone">
              <Input value={form.phone_primary ?? ""} onChange={(e) => set("phone_primary", e.target.value)} placeholder="+251 9xx xxx xxx" />
            </Field>
            <Field label="Secondary phone">
              <Input value={form.phone_secondary ?? ""} onChange={(e) => set("phone_secondary", e.target.value)} />
            </Field>
          </div>
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Addis Ababa, Ethiopia" />
          </Field>
          <Field label="Google Maps link">
            <Input value={form.maps_url ?? ""} onChange={(e) => set("maps_url", e.target.value)} placeholder="https://maps.google.com/..." />
          </Field>
          <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-4">
            <Field label="Exact map pin (recommended — precise location, not guessed from the address text)">
              <Input value={form.map_embed_url ?? ""} onChange={(e) => set("map_embed_url", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">
              On Google Maps: search your exact building/location → <strong>Share</strong> → <strong>Embed a map</strong> → copy the URL inside <code>src="..."</code> and paste it here.
              If left blank, the map falls back to searching for your Address text above, which can be imprecise.
            </p>
          </div>
          <Field label="Office hours">
            <Input value={form.office_hours ?? ""} onChange={(e) => set("office_hours", e.target.value)} placeholder="Mon – Fri · 9:00 – 17:00 EAT" />
          </Field>
        </TabsContent>

        <TabsContent value="social" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <p className="text-xs text-muted-foreground">
            Paste a full profile URL, or just the @handle — links are built automatically. Leave blank to hide a button.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facebook"><Input value={form.social_facebook ?? ""} onChange={(e) => set("social_facebook", e.target.value)} /></Field>
            <Field label="Instagram"><Input value={form.social_instagram ?? ""} onChange={(e) => set("social_instagram", e.target.value)} /></Field>
            <Field label="TikTok"><Input value={form.social_tiktok ?? ""} onChange={(e) => set("social_tiktok", e.target.value)} /></Field>
            <Field label="YouTube"><Input value={form.social_youtube ?? ""} onChange={(e) => set("social_youtube", e.target.value)} placeholder="@adeycerebralpalsy" /></Field>
            <Field label="Telegram Forum"><Input value={form.social_telegram_forum ?? ""} onChange={(e) => set("social_telegram_forum", e.target.value)} /></Field>
            <Field label="Telegram Channel"><Input value={form.social_telegram_channel ?? ""} onChange={(e) => set("social_telegram_channel", e.target.value)} /></Field>
            <Field label="LinkedIn (optional)"><Input value={form.social_linkedin ?? ""} onChange={(e) => set("social_linkedin", e.target.value)} /></Field>
          </div>
        </TabsContent>

        <TabsContent value="branding" className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Organization logo (navbar)">
              <MediaUpload folder="settings" value={form.logo_url} onChange={(url) => set("logo_url", url)} />
            </Field>
            <Field label="Footer logo (optional — falls back to main logo)">
              <MediaUpload folder="settings" value={form.footer_logo_url} onChange={(url) => set("footer_logo_url", url)} />
            </Field>
            <Field label="Favicon">
              <MediaUpload folder="settings" value={form.favicon_url} onChange={(url) => set("favicon_url", url)} />
              <p className="mt-1 text-xs text-muted-foreground">Browser tab icon. For best results use a square image.</p>
            </Field>
            <Field label="Hero image (optional, used where a static hero image is shown)">
              <MediaUpload folder="settings" value={form.hero_image_url} onChange={(url) => set("hero_image_url", url)} />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="theme" className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6">
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Theme</h3>
            <p className="mt-1 text-sm text-muted-foreground">Switch between the brand theme and a custom color anytime.</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => { set("theme_mode", "brand"); applyThemeMode("brand", null); }}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition ${form.theme_mode === "brand" ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted"}`}
              >
                <div className="flex gap-1.5">
                  <span className="h-6 w-6 rounded-full" style={{ background: "#0b3d68" }} />
                  <span className="h-6 w-6 rounded-full" style={{ background: "#f5c518" }} />
                  <span className="h-6 w-6 rounded-full border border-black/10 bg-white" />
                </div>
                <div className="mt-2 text-sm font-bold">Brand (default)</div>
                <div className="text-xs text-muted-foreground">Navy, gold & white — matches the logo</div>
              </button>
              <button
                type="button"
                onClick={() => { set("theme_mode", "custom"); applyThemeMode("custom", form.theme_color || THEME_PRESETS[0].hex); if (!form.theme_color) set("theme_color", THEME_PRESETS[0].hex); }}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition ${form.theme_mode === "custom" ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted"}`}
              >
                <span className="inline-block h-6 w-6 rounded-full" style={{ background: form.theme_color ?? THEME_PRESETS[0].hex }} />
                <div className="mt-2 text-sm font-bold">Custom</div>
                <div className="text-xs text-muted-foreground">Pick any color below</div>
              </button>
              <button
                type="button"
                onClick={() => { set("theme_mode", "sunshine"); applyThemeMode("sunshine", null); }}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition ${form.theme_mode === "sunshine" ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted"}`}
              >
                <div className="flex gap-1.5">
                  <span className="h-6 w-6 rounded-full" style={{ background: "hsl(199 89% 48%)" }} />
                  <span className="h-6 w-6 rounded-full" style={{ background: "hsl(14 90% 60%)" }} />
                  <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: "hsl(40 60% 98%)" }} />
                </div>
                <div className="mt-2 text-sm font-bold">Sunshine</div>
                <div className="text-xs text-muted-foreground">Sky blue, coral &amp; cream — brighter &amp; playful</div>
              </button>
            </div>
          </div>

          <div className={form.theme_mode !== "custom" ? "pointer-events-none opacity-40" : ""}>
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Brand color</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a preset or use the color wheel for a custom shade. Changes preview instantly — click Save to make them permanent.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3 sm:grid-cols-8">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                title={p.name}
                onClick={() => { set("theme_color", p.hex); applyThemeColor(p.hex); }}
                className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 transition ${
                  form.theme_color?.toLowerCase() === p.hex.toLowerCase() ? "ring-2 ring-offset-2 ring-primary" : "hover:bg-muted"
                }`}
              >
                <span className="h-9 w-9 rounded-full border border-black/10 shadow-sm" style={{ background: p.hex }} />
                <span className="text-[10px] text-muted-foreground">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <div>
              <Label>Custom color</Label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={form.theme_color ?? "#2b7fbf"}
                  onChange={(e) => { set("theme_color", e.target.value); applyThemeColor(e.target.value); }}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  aria-label="Custom color wheel"
                />
                <Input
                  value={form.theme_color ?? ""}
                  onChange={(e) => { set("theme_color", e.target.value); if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e.target.value)) applyThemeColor(e.target.value); }}
                  placeholder="#2b7fbf"
                  className="w-32"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => { set("theme_color", null); set("theme_mode", "brand"); applyThemeMode("brand", null); }}
            >
              Reset to brand theme
            </Button>
          </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <Field label="Website title">
            <Input value={form.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} />
          </Field>
          <Field label="Website description">
            <Textarea rows={3} value={form.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
          </Field>
          <Field label="Keywords (comma separated)">
            <Input value={form.seo_keywords ?? ""} onChange={(e) => set("seo_keywords", e.target.value)} />
          </Field>
        </TabsContent>

        <TabsContent value="homepage" className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6">
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Statistics strip</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Children supported"><Input value={form.stat_children_supported ?? ""} onChange={(e) => set("stat_children_supported", e.target.value)} placeholder="1,200+" /></Field>
              <Field label="Years of impact"><Input value={form.stat_years_of_impact ?? ""} onChange={(e) => set("stat_years_of_impact", e.target.value)} placeholder="9 Years" /></Field>
              <Field label="Partner clinics"><Input value={form.stat_partner_clinics ?? ""} onChange={(e) => set("stat_partner_clinics", e.target.value)} placeholder="14" /></Field>
              <Field label="Volunteers & staff"><Input value={form.stat_volunteers_staff ?? ""} onChange={(e) => set("stat_volunteers_staff", e.target.value)} placeholder="40+" /></Field>
            </div>
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">"A community built on dignity" stats (homepage)</h3>
            <p className="mt-1 text-xs text-muted-foreground">The 4-card block next to the homepage About section (94% / 6 regions / 3.5k sessions / 100%).</p>
            <div className="mt-3">
              <StatList items={form.impact_stats} onChange={(items) => set("impact_stats", items)} />
            </div>
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">"By the numbers" stats (About page)</h3>
            <p className="mt-1 text-xs text-muted-foreground">The 4-stat block on the About page (1,000+ children served, years of service, etc).</p>
            <div className="mt-3">
              <StatList items={form.by_numbers_stats} onChange={(items) => set("by_numbers_stats", items)} />
            </div>
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Hero section</h3>
            <div className="mt-3 space-y-4">
              <Field label="Hero heading (the last word is highlighted automatically)">
                <Input value={form.hero_heading ?? ""} onChange={(e) => set("hero_heading", e.target.value)} />
              </Field>
              <Field label="Hero subtext">
                <Textarea rows={3} value={form.hero_subtext ?? ""} onChange={(e) => set("hero_subtext", e.target.value)} />
              </Field>
            </div>
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Call to action</h3>
            <div className="mt-3 space-y-4">
              <Field label="CTA heading">
                <Input value={form.cta_heading ?? ""} onChange={(e) => set("cta_heading", e.target.value)} />
              </Field>
              <Field label="CTA subtext">
                <Textarea rows={2} value={form.cta_subtext ?? ""} onChange={(e) => set("cta_subtext", e.target.value)} />
              </Field>
            </div>
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Footer &amp; donations</h3>
            <div className="mt-3 space-y-4">
              <Field label="Footer blurb">
                <Textarea rows={2} value={form.footer_text ?? ""} onChange={(e) => set("footer_text", e.target.value)} />
              </Field>
              <Field label="Copyright line">
                <Input value={form.copyright_text ?? ""} onChange={(e) => set("copyright_text", e.target.value)} />
              </Field>
              <Field label="Donation info (shown on the Donate page)">
                <Textarea rows={3} value={form.donation_info ?? ""} onChange={(e) => set("donation_info", e.target.value)} />
              </Field>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="story" className="mt-6 space-y-8 rounded-2xl border border-border bg-card p-6">
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Founder / Executive Director</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={form.founder_name ?? ""} onChange={(e) => set("founder_name", e.target.value)} />
              </Field>
              <Field label="Title">
                <Input value={form.founder_title ?? ""} onChange={(e) => set("founder_title", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Photo">
                <MediaUpload folder="staff" value={form.founder_photo_url} onChange={(url) => set("founder_photo_url", url)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Quote / keynote line">
                <Textarea rows={2} value={form.founder_quote ?? ""} onChange={(e) => set("founder_quote", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Bio">
                <Textarea rows={4} value={form.founder_bio ?? ""} onChange={(e) => set("founder_bio", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Mother / Family Testimony (homepage)</h3>
            <div className="mt-3">
              <Field label="Photo">
                <MediaUpload folder="staff" value={form.testimony_photo_url} onChange={(url) => set("testimony_photo_url", url)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Name (optional — can stay anonymous, e.g. 'A mother from our community')">
                <Input value={form.testimony_mother_name ?? ""} onChange={(e) => set("testimony_mother_name", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Quote">
                <Textarea rows={3} value={form.testimony_quote ?? ""} onChange={(e) => set("testimony_quote", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Label>Progress points</Label>
              <p className="mt-1 text-xs text-muted-foreground">Short bullet points about the child's change/progress.</p>
              <div className="mt-2">
                <StringListEditor items={form.testimony_points} onChange={(items) => set("testimony_points", items)} placeholder="e.g. Improved sitting balance" />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="membership" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Membership</h3>
          <Field label="Google Form embed URL">
            <Input
              value={form.membership_form_url ?? ""}
              onChange={(e) => set("membership_form_url", e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            In Google Forms: Send → the <strong>&lt;&gt;</strong> embed icon → copy the URL from the iframe's <code>src</code> (or paste the plain form link — the site will add <code>?embedded=true</code> automatically).
            The Membership page shows this form and a "Mark as submitted" button people click after filling it out — that's what's counted, since we can't detect real Google Form submissions from an embedded iframe without a Google API integration.
          </p>

          <div className="border-t border-border pt-6">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Member Statistics</h3>
            <p className="mt-1 text-xs text-muted-foreground">Displayed on the Membership page.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Honorable Members">
                <Input value={form.stat_honorable_members ?? ""} onChange={(e) => set("stat_honorable_members", e.target.value)} placeholder="e.g. 5" />
              </Field>
              <Field label="Common Members">
                <Input value={form.stat_common_members ?? ""} onChange={(e) => set("stat_common_members", e.target.value)} placeholder="e.g. 45" />
              </Field>
              <Field label="Number of Children">
                <Input value={form.stat_children_count ?? ""} onChange={(e) => set("stat_children_count", e.target.value)} placeholder="e.g. 120" />
              </Field>
            </div>

            <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/30 p-4">
              <Label>Total ADEY CP Association Members</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {liveRegistered} people have registered via the form so far. Set the real current total here — new
                registrations will keep adding on top of it (e.g. set 60 now, and the next signup makes it 61, not 51).
              </p>
              <Input
                type="number"
                className="mt-2 max-w-[160px]"
                value={currentTotal}
                onChange={(e) => {
                  const wanted = Number(e.target.value);
                  if (Number.isFinite(wanted)) set("membership_total_offset", wanted - liveRegistered);
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={save} disabled={mut.isPending} className="shadow-xl">
          <Save className="mr-2 h-4 w-4" /> {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
