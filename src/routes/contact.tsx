import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { submitContactMessage } from "@/lib/cms-public";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Adey CP" },
      { name: "description", content: "Get in touch with Adey CP Humanitarian Association — partners, volunteers, donors, and families welcome." },
      { property: "og:title", content: "Contact Adey CP" },
      { property: "og:description", content: "Get in touch with our team." },
    ],
  }),
  component: Contact,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(5, "Please write a longer message").max(2000),
});

function Contact() {
  const settings = useSiteSettings();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const contactRows = [
    settings.address ? { i: MapPin, t: "Visit", v: settings.address, href: settings.maps_url ?? undefined } : null,
    settings.phone_primary ? { i: Phone, t: "Call", v: [settings.phone_primary, settings.phone_secondary].filter(Boolean).join(" · "), href: `tel:${settings.phone_primary}` } : null,
    settings.email ? { i: Mail, t: "Email", v: settings.email, href: `mailto:${settings.email}` } : null,
  ].filter(Boolean) as { i: typeof MapPin; t: string; v: string; href?: string }[];

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = contactSchema.parse(form);
      return submitContactMessage({ data: { name: parsed.name, email: parsed.email, subject: parsed.subject ?? null, message: parsed.message } });
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Message sent — we'll be in touch soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    },
    onError: (e: any) => {
      if (e?.issues) toast.error(e.issues[0]?.message ?? "Please check the form");
      else toast.error(e?.message ?? "Could not send message");
    },
  });

  return (
    <SiteLayout>
      <PageHero eyebrow="Contact" title="We'd love to hear from you.">
        Whether you want to partner, volunteer, or learn more — reach out.
      </PageHero>

      {settings.address ? (
        <section className="bg-ink py-16 text-white">
          <div className="container-adey grid gap-0 overflow-hidden rounded-3xl border border-white/10 md:grid-cols-2">
            <div className="bg-black/30 p-8 md:p-10">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Find Us</div>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Our Location</h2>
              <p className="mt-4 text-white/70">Come visit us — we'd love to welcome you in person.</p>

              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-white/60">Address</div>
                <div className="text-lg text-white">{settings.address}</div>
              </div>

              {settings.office_hours ? (
                <div className="mt-6 space-y-1">
                  <div className="text-sm font-semibold text-white/60">Office Hours</div>
                  <div className="text-white/90">{settings.office_hours}</div>
                </div>
              ) : null}

              <a
                href={settings.maps_url || `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}`}
                target="_blank" rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-heading font-bold text-accent-foreground transition hover:brightness-95"
              >
                <MapPin className="h-4 w-4" /> Get Directions
              </a>
            </div>
            <div className="min-h-[320px] bg-muted">
              <iframe
                title="Map to our location"
                src={settings.map_embed_url || `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
                className="h-full min-h-[320px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-pad">
        <div className="container-adey grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">Organization details</div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Organization</dt><dd className="font-medium text-ink">{settings.org_name}</dd></div>
                {settings.address_subcity ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Sub City</dt><dd className="text-body">{settings.address_subcity}</dd></div> : null}
                {settings.address_woreda ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Woreda / Area</dt><dd className="text-body">{settings.address_woreda}</dd></div> : null}
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">City</dt><dd className="text-body">Addis Ababa, Ethiopia</dd></div>
                {settings.phone_primary ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Telephone</dt><dd className="text-body">{[settings.phone_primary, settings.phone_secondary].filter(Boolean).join(" · ")}</dd></div> : null}
                {settings.email ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Email</dt><dd className="text-body">{settings.email}</dd></div> : null}
              </dl>
            </div>

            {settings.contact_person_name ? (
              <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Contact person</div>
                <div className="mt-2 font-heading text-lg font-bold text-ink">{settings.contact_person_name}</div>
                {settings.contact_person_title ? <div className="text-sm font-semibold text-primary">{settings.contact_person_title}</div> : null}
                <div className="mt-3 space-y-1 text-sm">
                  {settings.contact_person_phone ? (
                    <a href={`tel:${settings.contact_person_phone}`} className="flex items-center gap-2 text-body hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {settings.contact_person_phone}
                    </a>
                  ) : null}
                  {settings.contact_person_email ? (
                    <a href={`mailto:${settings.contact_person_email}`} className="flex items-center gap-2 text-body hover:text-primary">
                      <Mail className="h-3.5 w-3.5" /> {settings.contact_person_email}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {contactRows.map((row) => {
              const content = (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <row.i className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{row.t}</div>
                    <div className="font-heading text-lg text-ink">{row.v}</div>
                  </div>
                </>
              );
              return row.href ? (
                <a key={row.t} href={row.href} target={row.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
                  {content}
                </a>
              ) : (
                <div key={row.t} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                  {content}
                </div>
              );
            })}
            {settings.office_hours ? (
              <div className="rounded-2xl border border-border bg-primary-soft/40 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Office hours</div>
                <div className="mt-1 text-sm text-body">{settings.office_hours}</div>
              </div>
            ) : null}
          </div>

          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          >
            {sent ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Thanks — your message is on its way.</div>
                <p className="mt-1 text-emerald-700/90">We reply within a couple of business days.</p>
              </div>
            ) : null}
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="name">Name</label>
              <input id="name" required maxLength={100} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="email">Email</label>
              <input id="email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="subject">Subject (optional)</label>
              <input id="subject" maxLength={150} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="message">Message</label>
              <textarea id="message" required maxLength={2000} rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={mut.isPending}>
              <Send className="h-4 w-4" /> {mut.isPending ? "Sending…" : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
