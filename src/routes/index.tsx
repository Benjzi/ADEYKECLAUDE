import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { HandHeart, HeartHandshake, GraduationCap, Users, Stethoscope, Sparkles, ArrowRight, MapPin, PlayCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { listPublicPartners, listPublishedNews, listPublishedEvents } from "@/lib/cms-public";
import { useSiteSettings, siteSettingsQuery } from "@/lib/site-settings";

const partnersQuery = queryOptions({ queryKey: ["public", "partners"], queryFn: () => listPublicPartners() });
const homeNewsQuery = queryOptions({ queryKey: ["public", "news", "home"], queryFn: () => listPublishedNews() });
const homeEventsQuery = queryOptions({ queryKey: ["public", "events", "home"], queryFn: () => listPublishedEvents() });

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    const title = s?.seo_title || "Adey CP Humanitarian Association — Every Child Deserves to Thrive";
    const description = s?.seo_description || "We walk alongside children with Cerebral Palsy and their families across Ethiopia — providing therapy, dignity, community, and a future full of possibility.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(s?.seo_keywords ? [{ name: "keywords", content: s.seo_keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  loader: async ({ context }) => {
    const [, , , settings] = await Promise.all([
      context.queryClient.ensureQueryData(partnersQuery),
      context.queryClient.ensureQueryData(homeNewsQuery),
      context.queryClient.ensureQueryData(homeEventsQuery),
      context.queryClient.ensureQueryData(siteSettingsQuery),
    ]);
    return { settings };
  },
  component: Home,
});

const PROGRAMS = [
  { icon: Stethoscope, title: "Therapy & Care", body: "Physiotherapy, occupational therapy and clinical care through our partner clinic network." },
  { icon: GraduationCap, title: "Inclusive Education", body: "Learning pathways adapted to each child's abilities, in classrooms that welcome them." },
  { icon: HeartHandshake, title: "Family Support", body: "Counselling, respite and parent training so caregivers never walk this journey alone." },
  { icon: Users, title: "Community Awareness", body: "Fighting stigma with education campaigns, storytelling, and community outreach." },
];

function Home() {
  const settings = useSiteSettings();
  const STATS = [
    { num: settings.stat_children_supported, label: "Children supported" },
    { num: settings.stat_years_of_impact, label: "Of impact" },
    { num: settings.stat_partner_clinics, label: "Partner clinics" },
    { num: settings.stat_volunteers_staff, label: "Volunteers & staff" },
  ].filter((s) => s.num);
  const heroWords = (settings.hero_heading || "Every Child Deserves to Thrive").split(" ");
  const heroLast = heroWords.pop();
  const heroLead = heroWords.join(" ");
  const { data: partners } = useSuspenseQuery(partnersQuery);
  const { data: news } = useSuspenseQuery(homeNewsQuery);
  const { data: events } = useSuspenseQuery(homeEventsQuery);
  const featuredNews = news.slice(0, 3);
  const now = Date.now();
  const featuredEvents = events.filter((e) => new Date(e.starts_at).getTime() >= now).slice(0, 3);
  return (
    <SiteLayout>
      {/* HERO — full-bleed photo slideshow background */}
      <section className="relative min-h-[640px] overflow-hidden text-white md:min-h-[720px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-dark" />
        <div className="absolute inset-0">
          <HeroSlideshow images={settings.hero_slideshow} altPrefix={settings.org_name} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/20 to-transparent" />

        <div className="container-adey relative flex min-h-[640px] flex-col justify-end pb-20 pt-32 md:min-h-[720px] md:pb-24">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-heading text-sm font-bold uppercase tracking-widest text-white">{settings.org_name}</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-7xl">
            {heroLead} <span className="text-accent">{heroLast}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90 drop-shadow">
            {settings.hero_subtext}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/donate" className="btn-accent">
              <HandHeart className="h-5 w-5" /> Support Our Mission
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-7 py-3 font-heading font-bold text-white transition-colors hover:bg-white/10"
            >
              Who We Are <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative border-t border-white/15 bg-black/30 backdrop-blur-md">
          <div className="container-adey grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center md:text-left">
                <div className="font-heading text-2xl font-bold text-accent md:text-3xl">{s.num}</div>
                <div className="text-xs uppercase tracking-wider text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ABOUT */}
      <section id="about" className="section-pad">
        <div className="container-adey grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Who We Are</div>
            <h2 className="mt-3 text-3xl md:text-4xl">A community built on dignity and possibility.</h2>
            <p className="mt-4 text-body">
              {settings.long_description}
            </p>
            <p className="mt-3 text-body">
              Our approach is holistic: therapy strengthens bodies, inclusive schooling
              opens minds, and community programs shift how our neighbours see disability.
            </p>
            <Link to="/about" className="btn-primary mt-6">
              Read Our Story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {settings.impact_stats.map((k) => (
              <div key={k.l} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="font-heading text-2xl font-bold text-primary">{k.n}</div>
                <div className="mt-1 text-sm text-body">{k.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="bg-primary-soft/40 section-pad">
        <div className="container-adey">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Our Programs</div>
            <h2 className="mt-3 text-3xl md:text-4xl">Care that meets a child where they are.</h2>
            <p className="mt-3 text-body">Four connected pillars, one child at a time.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAMS.map((p) => (
              <div key={p.title} className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg">{p.title}</h3>
                <p className="mt-2 text-sm text-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOTHER TESTIMONY */}
      {settings.testimony_photo_url || settings.testimony_quote ? (
        <section className="section-pad">
          <div className="container-adey">
            <div className="grid gap-10 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-lifted)] md:grid-cols-[0.9fr_1.1fr]">
              {settings.testimony_photo_url ? (
                <div className="relative min-h-[280px]">
                  <img src={settings.testimony_photo_url} alt={settings.testimony_mother_name ?? "A mother from our community"} className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="flex flex-col justify-center p-8 md:p-12">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">A Family's Story</div>
                {settings.testimony_quote ? (
                  <blockquote className="mt-4 font-heading text-2xl leading-snug text-ink md:text-3xl">
                    "{settings.testimony_quote}"
                  </blockquote>
                ) : null}
                {settings.testimony_mother_name ? (
                  <div className="mt-4 text-sm font-semibold text-primary">— {settings.testimony_mother_name}</div>
                ) : null}
                {settings.testimony_points.length > 0 ? (
                  <ul className="mt-6 space-y-2">
                    {settings.testimony_points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-body">
                        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" /> {pt}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* VIDEO SECTION (dedicated wide) */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <PlayCircle className="h-4 w-4" /> Watch our story
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl">Meet the children and families of Adey CP.</h2>
            <p className="mt-3 text-body">A short film about the work, the families, and the change we're building together.</p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border border-border bg-black shadow-[var(--shadow-lifted)]">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/J4Hrt4U-_iA?rel=0&modestbranding=1"
                title="Adey CP — Full story"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED EVENTS */}
      {featuredEvents.length > 0 && (
        <section className="section-pad bg-primary-soft/30">
          <div className="container-adey">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Upcoming Events</div>
                <h2 className="mt-2 text-3xl md:text-4xl">Come be with us.</h2>
              </div>
              <Link to="/news-events" className="text-sm font-bold text-primary hover:underline">
                See all events <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {featuredEvents.map((e) => (
                <Link
                  key={e.id}
                  to="/events/$slug"
                  params={{ slug: e.slug }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {e.cover_image_url ? (
                      <img src={e.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
                    )}
                    <div className="absolute left-4 top-4 rounded-xl bg-white px-3 py-2 text-center shadow">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-accent-dark">
                        {new Date(e.starts_at).toLocaleDateString(undefined, { month: "short" })}
                      </div>
                      <div className="font-heading text-xl font-bold text-ink leading-none">
                        {new Date(e.starts_at).getDate()}
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary">{e.title}</h3>
                    {e.location ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {e.location}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED NEWS */}
      {featuredNews.length > 0 && (
        <section className="section-pad">
          <div className="container-adey">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Latest News</div>
                <h2 className="mt-2 text-3xl md:text-4xl">Stories from the field.</h2>
              </div>
              <Link to="/news-events" className="text-sm font-bold text-primary hover:underline">
                Read all stories <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {featuredNews.map((n) => (
                <Link
                  key={n.id}
                  to="/news/$slug"
                  params={{ slug: n.slug }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                    {n.cover_image_url ? (
                      <img src={n.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/20" />
                    )}
                  </div>
                  <div className="p-5">
                    {n.category ? <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-dark">{n.category}</div> : null}
                    <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary">{n.title}</h3>
                    {n.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-body">{n.excerpt}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-pad">
        <div className="container-adey">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-primary-dark p-10 text-center text-white shadow-[var(--shadow-lifted)] md:p-14">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
            <h2 className="relative text-3xl text-white md:text-4xl">{settings.cta_heading}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/85">
              {settings.cta_subtext}
            </p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/donate" className="btn-accent">
                <HandHeart className="h-5 w-5" /> Donate Now
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-7 py-3 font-heading font-bold text-white/95 hover:bg-white/10">
                Partner With Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      {partners.length > 0 ? (
        <section className="pb-20">
          <div className="container-adey">
            <div className="text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Trusted by partners across Ethiopia
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {partners.map((p) => {
                const inner = p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="max-h-10 max-w-[80%] object-contain" loading="lazy" />
                ) : (
                  <span className="px-2 text-center text-sm font-semibold text-muted-foreground">{p.name}</span>
                );
                return (
                  <div key={p.id} className="flex h-16 items-center justify-center rounded-xl border border-border bg-card">
                    {p.website_url ? (
                      <a href={p.website_url} target="_blank" rel="noreferrer" title={p.name} className="flex h-full w-full items-center justify-center">
                        {inner}
                      </a>
                    ) : inner}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </SiteLayout>
  );
}
