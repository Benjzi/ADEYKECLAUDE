import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Heart, Users, Sparkles, Target, ShieldCheck, HandHeart } from "lucide-react";
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
  { icon: Heart, t: "Dignity", b: "Every child is treated with the respect they deserve — no exceptions." },
  { icon: Users, t: "Family-first", b: "We support caregivers as the lifelong therapists they already are." },
  { icon: ShieldCheck, t: "Evidence-based", b: "Our programs follow WHO and international CP standards of care." },
  { icon: Sparkles, t: "Radical hope", b: "We believe in what's possible — and we build it, one child at a time." },
];

const milestones = [
  { y: "2016", t: "Founded in Addis Ababa", b: "A small group of families and clinicians began weekend therapy in a borrowed room." },
  { y: "2018", t: "First community center", b: "Opened a permanent space with physio, speech and occupational therapy." },
  { y: "2021", t: "Rural outreach", b: "Mobile clinics reached families in Oromia, Amhara and SNNPR regions." },
  { y: "2024", t: "Inclusive schools", b: "Launched teacher-training partnerships with public schools across Addis." },
  { y: "2026", t: "1,000+ children served", b: "Serving over a thousand children and their families every year." },
];

function About() {
  const { data: staff } = useSuspenseQuery(staffQuery);
  const settings = useSiteSettings();
  const missionVision = [
    { icon: Target, t: "Our Mission", b: settings.mission || "To ensure every Ethiopian child with Cerebral Palsy receives dignified care, inclusive education, and a thriving community." },
    { icon: Sparkles, t: "Our Vision", b: settings.vision || "An Ethiopia where disability is met with opportunity — not stigma — and every child can thrive alongside their peers." },
    { icon: HandHeart, t: "Our Promise", b: "No family walks alone. From diagnosis to adulthood, we stand beside every child and caregiver." },
  ];
  return (
    <SiteLayout>
      <PageHero eyebrow="About Us" title="A movement for every child with Cerebral Palsy in Ethiopia.">
        {settings.short_description || "Adey CP Humanitarian Association was founded in 2016 by families and clinicians who refused to accept that a diagnosis should decide a child's future."}
      </PageHero>

      {/* Mission / Vision */}
      <section className="section-pad">
        <div className="container-adey grid gap-6 md:grid-cols-3">
          {missionVision.map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl">{c.t}</h3>
              <p className="mt-2 text-body">{c.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="bg-muted/40 section-pad">
        <div className="container-adey grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Our Story</div>
            <h2 className="mt-3 text-3xl md:text-4xl">Built by families, for families.</h2>
            <div className="mt-4 space-y-4 text-body">
              <p>
                Adey CP began in a small room in Addis Ababa, when a handful of mothers
                looking for physiotherapy for their children realized there was almost no
                organized care for Cerebral Palsy in Ethiopia. They started teaching each
                other — and inviting therapists to join them.
              </p>
              <p>
                A decade later, Adey CP is one of Ethiopia's leading CP organizations —
                serving children through direct therapy, caregiver training, inclusive
                education partnerships, mobile rural clinics, and national advocacy for
                disability rights.
              </p>
              <p>
                Everything we do is grounded in the same idea we started with: <strong>every
                child deserves to thrive.</strong>
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <h3 className="text-xl">By the numbers</h3>
            <div className="mt-6 grid grid-cols-2 gap-6">
              {settings.by_numbers_stats.map((s) => (
                <div key={s.l}>
                  <div className="font-heading text-3xl font-bold text-primary">{s.n}</div>
                  <div className="mt-1 text-sm text-body">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">What we stand for</div>
            <h2 className="mt-3 text-3xl md:text-4xl">Our values.</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.t} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg">{v.t}</h3>
                <p className="mt-2 text-sm text-body">{v.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-primary-soft/30 section-pad">
        <div className="container-adey">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Our Journey</div>
            <h2 className="mt-3 text-3xl md:text-4xl">Ten years of showing up.</h2>
          </div>
          <ol className="relative mx-auto mt-12 max-w-3xl border-l-2 border-primary/30 pl-6">
            {milestones.map((m) => (
              <li key={m.y} className="mb-8 last:mb-0">
                <div className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full bg-primary ring-4 ring-primary-soft" />
                <div className="text-sm font-bold text-primary">{m.y}</div>
                <div className="mt-1 font-heading text-lg font-bold">{m.t}</div>
                <p className="mt-1 text-body">{m.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Team */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Our Team</div>
            <h2 className="mt-3 text-3xl md:text-4xl">The people behind Adey CP.</h2>
            <p className="mt-3 text-body">
              Clinicians, educators, and family advocates working together for every child.
            </p>
          </div>

          {staff.length === 0 ? (
            <p className="mt-10 text-center text-muted-foreground">
              Staff profiles will appear here once the team uploads them.
            </p>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
