import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Sparkles, Target, ShieldCheck, HandHeart, Handshake, Megaphone, Quote, BookOpen, History, UsersRound, FileText } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { listPublicStaff } from "@/lib/cms-public";
import { useSiteSettings } from "@/lib/site-settings";

const staffQuery = queryOptions({
  queryKey: ["public", "staff"],
  queryFn: () => listPublicStaff(),
});

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Adey CP Humanitarian Association" },
      { name: "description", content: "Adey CP is an Ethiopian non-profit supporting children with Cerebral Palsy through therapy, family support, inclusive education, and advocacy." },
      { property: "og:title", content: "About Adey CP" },
      { property: "og:description", content: "Our mission, values, and the community behind Adey CP." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(staffQuery),
  component: About,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="section-pad container-adey text-center text-destructive">{error.message}</div>
    </SiteLayout>
  ),
});

const values = [
  { icon: Users, t: "Inclusivity", b: "We promote equal participation and dignity for all, regardless of ability or background." },
  { icon: Sparkles, t: "Empowerment", b: "We equip families and caregivers with training, resources, and economic opportunities." },
  { icon: Megaphone, t: "Advocacy", b: "We work for policies and public awareness that secure equal rights for people with CP." },
  { icon: ShieldCheck, t: "Sustainability", b: "We build long-term, lasting solutions rather than one-time interventions." },
  { icon: Handshake, t: "Collaboration", b: "We partner with government, NGOs, and communities to multiply our impact." },
];

const milestones = [
  { y: "2024", t: "Founded in Addis Ababa", b: "Established by five dedicated individuals, with 16 General Assembly Members and a 5-member Board of Directors." },
  { y: "2024", t: "Officially licensed", b: "Licensed by the Authority for Civil Society Organizations (ACSO), Ethiopia." },
  { y: "Ongoing", t: "Therapy & rehabilitation", b: "Physiotherapy, occupational therapy, speech therapy, and assistive device support for children with CP." },
  { y: "Ongoing", t: "Caregiver empowerment", b: "Training, resources, and economic opportunities for mothers and caregivers." },
  { y: "Growing", t: "Community & advocacy", b: "Awareness campaigns, inclusive-education partnerships, and policy advocacy across Ethiopia." },
];

const TABS = [
  { id: "mission", label: "Mission & Vision", icon: Target },
  { id: "story", label: "Our Story & Journey", icon: History },
  { id: "values", label: "Values & Goals", icon: ShieldCheck },
  { id: "team", label: "Founder & Team", icon: UsersRound },
] as const;

function About() {
  const { data: staff } = useSuspenseQuery(staffQuery);
  const settings = useSiteSettings();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("mission");

  return (
    <SiteLayout>
      <PageHero eyebrow="About Us" title="A movement for every child with Cerebral Palsy in Ethiopia.">
        {settings.short_description || "Adey Cerebral Palsy Charitable Association is a community-based organization supporting children with Cerebral Palsy and empowering their families in Ethiopia."}
      </PageHero>

      {/* Tabbed navigation — everything organized in one place instead of a long scroll */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-body hover:bg-muted"
                }`}
              >
                <t.icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            {tab === "mission" ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { icon: Target, t: "Our Mission", b: settings.mission },
                  { icon: Sparkles, t: "Our Vision", b: settings.vision },
                  { icon: HandHeart, t: "Our Promise", b: "No family walks alone. From diagnosis to adulthood, we stand beside every child and caregiver." },
                ].map((c) => (
                  <div key={c.t} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <c.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-xl">{c.t}</h3>
                    <p className="mt-2 text-body">{c.b}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {tab === "story" ? (
              <div className="space-y-10">
                <div className="grid gap-10 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)] md:grid-cols-[1.2fr_0.8fr] md:p-10">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                      <BookOpen className="h-4 w-4" /> Our Story
                    </div>
                    <h2 className="mt-3 text-2xl md:text-3xl">Built by families, for families.</h2>
                    <div className="mt-4 space-y-4 text-body">
                      <p>
                        Adey Cerebral Palsy Charitable Association was established in Addis Ababa
                        by five dedicated individuals who saw how little organized support existed
                        for children with Cerebral Palsy in Ethiopia — and decided to build it.
                      </p>
                      <p>
                        Today, with 16 General Assembly Members and a 5-member Board of Directors,
                        Adey CP provides therapy, caregiver training, inclusive-education support,
                        and advocacy for children with CP and their families across the country.
                      </p>
                      <p>Everything we do is grounded in one idea: <strong>every child deserves to thrive.</strong></p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-primary-soft/40 p-6">
                    <h3 className="text-lg">By the numbers</h3>
                    <div className="mt-6 grid grid-cols-2 gap-6">
                      {settings.by_numbers_stats.map((s) => (
                        <div key={s.l}>
                          <div className="font-heading text-2xl font-bold text-primary">{s.n}</div>
                          <div className="mt-1 text-xs text-body">{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-center text-xl">Our Journey</h3>
                  <ol className="relative mx-auto mt-8 max-w-2xl border-l-2 border-primary/30 pl-6">
                    {milestones.map((m, i) => (
                      <li key={i} className="mb-8 last:mb-0">
                        <div className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full bg-primary ring-4 ring-primary-soft" />
                        <div className="text-sm font-bold text-primary">{m.y}</div>
                        <div className="mt-1 font-heading text-lg font-bold">{m.t}</div>
                        <p className="mt-1 text-body">{m.b}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}

            {tab === "values" ? (
              <div className="space-y-10">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {values.map((v) => (
                    <div key={v.t} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <v.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3 text-lg">{v.t}</h3>
                      <p className="mt-1 text-sm text-body">{v.b}</p>
                    </div>
                  ))}
                </div>

                {settings.strategic_goals.length > 0 ? (
                  <div>
                    <div className="text-center">
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Five-Year Strategic Plan · 2026–2030</div>
                      <h3 className="mt-2 text-2xl">Our Strategic Goals</h3>
                    </div>
                    <div className="mt-8 grid gap-5 sm:grid-cols-2">
                      {settings.strategic_goals.map((g, i) => (
                        <div key={g.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                          <div className={`px-5 py-3 font-heading font-bold text-white ${i % 2 === 0 ? "bg-primary" : "bg-accent text-accent-foreground"}`}>
                            {g.title}
                          </div>
                          {g.points.length > 0 ? (
                            <ul className="space-y-2 p-5">
                              {g.points.map((pt) => (
                                <li key={pt} className="flex items-start gap-2 text-sm text-body">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-dark" /> {pt}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="p-5 text-sm italic text-muted-foreground">Details coming soon.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : settings.goals ? (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5 text-primary" /> Our Goals</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {settings.goals.split(/\.\s+/).map((g) => g.trim()).filter(Boolean).map((g) => (
                        <div key={g} className="flex items-start gap-2 text-sm text-body">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {g.replace(/\.$/, "")}.
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {settings.policy_documents.length > 0 ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-6">
                    <h3 className="text-lg">Governance &amp; Policies</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Read our official policy documents.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {settings.policy_documents.map((doc) => (
                        <a
                          key={doc.title} href={doc.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary"
                        >
                          <FileText className="h-4 w-4" /> {doc.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "team" ? (
              <div className="space-y-10">
                {settings.founder_name ? (
                  <div className="grid gap-8 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-lifted)] md:grid-cols-[0.8fr_1.2fr]">
                    <div className="relative min-h-[240px] bg-primary-soft">
                      {settings.founder_photo_url ? (
                        <img src={settings.founder_photo_url} alt={settings.founder_name} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full min-h-[240px] w-full items-center justify-center">
                          <span className="font-heading text-6xl font-bold text-primary/40">
                            {settings.founder_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center p-6 md:p-10">
                      <Quote className="h-7 w-7 text-accent" />
                      {settings.founder_quote ? (
                        <blockquote className="mt-2 font-heading text-xl leading-snug text-ink md:text-2xl">
                          "{settings.founder_quote}"
                        </blockquote>
                      ) : null}
                      <div className="mt-5">
                        <div className="text-lg font-bold text-ink">{settings.founder_name}</div>
                        {settings.founder_title ? <div className="text-sm font-semibold text-primary">{settings.founder_title}</div> : null}
                      </div>
                      {settings.founder_bio ? <p className="mt-3 text-sm leading-relaxed text-body">{settings.founder_bio}</p> : null}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-center text-xl">The people behind Adey CP</h3>
                  {staff.length === 0 ? (
                    <p className="mt-6 text-center text-muted-foreground">Staff profiles will appear here once the team uploads them.</p>
                  ) : (
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {staff.map((s) => (
                        <article key={s.id} className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
                          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-primary-soft">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold text-primary">
                                {s.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                              </div>
                            )}
                          </div>
                          <h3 className="mt-4 text-lg">{s.full_name}</h3>
                          {s.role_title ? <div className="mt-0.5 text-sm font-semibold text-primary">{s.role_title}</div> : null}
                          {s.bio ? <p className="mt-3 text-sm text-body">{s.bio}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-[var(--shadow-card)] md:p-14">
            <h2 className="text-3xl md:text-4xl">Stand with us.</h2>
            <p className="mx-auto mt-3 max-w-2xl opacity-90">
              Every donation, every volunteer hour, every conversation moves us closer to
              an Ethiopia where every child can thrive.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/donate" className="rounded-full bg-white px-6 py-3 font-semibold text-primary hover:bg-white/90">
                Donate now
              </Link>
              <Link to="/contact" className="rounded-full border border-white/50 px-6 py-3 font-semibold text-white hover:bg-white/10">
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
