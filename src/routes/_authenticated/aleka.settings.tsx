import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { siteSettingsQuery, useUpdateSiteSettings, applyThemeColor, THEME_PRESETS, type SiteSettings } from "@/lib/site-settings";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaUpload } from "@/components/admin/MediaUpload";

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

function SettingsAdmin() {
  const { data } = useSuspenseQuery(siteSettingsQuery);
  const [form, setForm] = useState<SiteSettings>(data);
  const mut = useUpdateSiteSettings();

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

      <Tabs defaultValue="org" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="theme">Theme Color</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
        </TabsList>

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
              onClick={() => { set("theme_color", null); applyThemeColor(null); }}
            >
              Reset to default blue
            </Button>
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
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={save} disabled={mut.isPending} className="shadow-xl">
          <Save className="mr-2 h-4 w-4" /> {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
