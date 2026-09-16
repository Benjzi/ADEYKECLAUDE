import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Phone, Mail, MapPin, ArrowRight, HandHeart, Baby, Users, Building2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Our Programs — Adey CP" },
      { name: "description", content: "Therapy, inclusive education, assistive devices, caregiver empowerment, early detection, and advocacy for children with Cerebral Palsy in Ethiopia." },
      { property: "og:title", content: "Our Programs — Adey CP" },
    ],
  }),
  component: Programs,
});

function Programs() {
  const s = useSiteSettings();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <SiteLayout>
      <PageHero eyebrow="Our Programs" title="How we support children and families.">
        Every program exists for one reason — to help children with Cerebral Palsy live fuller, more independent lives.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          {/* Expandable program list */}
          <div>
            {s.programs.length === 0 ? (
              <p className="text-muted-foreground">Programs will appear here once they're added in the admin panel.</p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {s.programs.map((p, i) => {
                  const open = openIdx === i;
                  return (
                    <div key={p.title}>
                      <button
                        onClick={() => setOpenIdx(open ? null : i)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-primary-soft/40"
                      >
                        <span className="flex items-center gap-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-sm font-bold text-primary">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-heading text-lg font-bold text-ink">{p.title}</span>
                        </span>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <p className="px-6 pb-6 pl-[4.75rem] text-body">{p.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contact / CTA sidebar — fills the space instead of leaving it empty */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="font-heading text-lg font-bold text-ink">Get in touch</h2>
              <p className="mt-1 text-sm text-muted-foreground">Questions about a program, or need support for your child?</p>
              <ul className="mt-5 space-y-4 text-sm">
                {s.address ? (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-body">
                      {s.address_subcity ? <span className="block">{s.address_subcity}</span> : null}
                      <span className="block">{s.address_woreda || s.address}</span>
                      <span className="block text-muted-foreground">Addis Ababa, Ethiopia</span>
                    </span>
                  </li>
                ) : null}
                {s.phone_primary ? (
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a href={`tel:${s.phone_primary}`} className="text-body hover:text-primary">
                      {s.phone_primary}
                      {s.phone_secondary ? <span className="block">{s.phone_secondary}</span> : null}
                    </a>
                  </li>
                ) : null}
                {s.email ? (
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a href={`mailto:${s.email}`} className="text-body hover:text-primary">{s.email}</a>
                  </li>
                ) : null}
              </ul>

              {s.contact_person_name ? (
                <div className="mt-5 rounded-xl bg-primary-soft/50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">Contact person</div>
                  <div className="mt-1 font-semibold text-ink">{s.contact_person_name}</div>
                  {s.contact_person_title ? <div className="text-xs text-muted-foreground">{s.contact_person_title}</div> : null}
                  {s.contact_person_phone ? <a href={`tel:${s.contact_person_phone}`} className="mt-2 block text-sm text-body hover:text-primary">{s.contact_person_phone}</a> : null}
                  {s.contact_person_email ? <a href={`mailto:${s.contact_person_email}`} className="block text-sm text-body hover:text-primary">{s.contact_person_email}</a> : null}
                </div>
              ) : null}

              <Link to="/contact" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                Contact page <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#0b3d68] to-primary-dark p-6 text-white shadow-[var(--shadow-card)]">
              <HandHeart className="h-7 w-7 text-accent" />
              <h3 className="mt-3 font-heading text-lg font-bold">Support a program</h3>
              <p className="mt-1 text-sm text-white/80">Your gift funds therapy sessions, learning materials, and assistive devices.</p>
              <Link to="/donate" className="btn-accent mt-4 w-full">Donate now</Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Who our programs serve */}
      <section className="section-pad bg-muted/40">
        <div className="container-adey">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Who We Serve</div>
            <h2 className="mt-3 text-3xl md:text-4xl">Every program starts with a child and a family.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Baby, t: "Children with Cerebral Palsy", b: "From early diagnosis through adolescence — therapy, education, assistive devices, and the chance to reach their own milestones." },
              { icon: Users, t: "Mothers & Caregivers", b: "Training, peer support, and income-generating skills so families are equipped and never carry this alone." },
              { icon: Building2, t: "Communities & Institutions", b: "Health workers, teachers, and policymakers — because lasting change needs the whole system, not just one clinic." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-ink">{c.t}</h3>
                <p className="mt-2 text-sm text-body">{c.b}</p>
              </div>
            ))}
          </div>

          {s.impact_stats.length > 0 ? (
            <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
              {s.impact_stats.map((k) => (
                <div key={k.l} className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-soft)]">
                  <div className="font-heading text-2xl font-bold text-primary">{k.n}</div>
                  <div className="mt-1 text-xs text-body">{k.l}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Referral / next steps */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Reach out", b: "Contact us by phone, email, or the contact form — or visit us in person." },
              { n: "02", t: "Assessment", b: "We learn about the child's needs and connect them with the right therapy and support." },
              { n: "03", t: "Ongoing support", b: "Regular sessions, caregiver training, assistive devices, and a community that stays with you." },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="font-heading text-3xl font-bold text-accent-dark">{step.n}</div>
                <h3 className="mt-2 font-heading text-lg font-bold text-ink">{step.t}</h3>
                <p className="mt-1 text-sm text-body">{step.b}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="btn-primary">Talk to our team <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/partners" className="inline-flex items-center gap-2 rounded-full border-2 border-border px-6 py-3 font-heading font-bold text-body transition hover:border-primary hover:text-primary">
              See our partners
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
