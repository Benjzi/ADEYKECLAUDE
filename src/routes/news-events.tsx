import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Newspaper, CalendarDays, MapPin, ArrowUpRight, Clock } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { Countdown } from "@/components/site/Countdown";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, EmptyState } from "@/components/site/PageHero";
import {
  listPublishedNews,
  listPublishedEvents,
  type NewsListItem,
  type EventListItem,
} from "@/lib/cms-public";
import { MediaImage } from "@/components/site/MediaImage";

const newsQ = queryOptions({
  queryKey: ["news", "public", "list"],
  queryFn: () => listPublishedNews(),
});
const eventsQ = queryOptions({
  queryKey: ["events", "public", "list"],
  queryFn: () => listPublishedEvents(),
});

export const Route = createFileRoute("/news-events")({
  head: () => ({
    meta: [
      { title: "News & Events — Adey CP" },
      {
        name: "description",
        content: "Latest news, stories, and upcoming events from Adey CP Humanitarian Association.",
      },
      { property: "og:title", content: "News & Events — Adey CP" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(newsQ),
      context.queryClient.ensureQueryData(eventsQ),
    ]),
  component: NewsAndEvents,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="container-adey py-24 text-center">
          <h1>Couldn't load this page</h1>
          <p className="mt-2 text-body">{error.message}</p>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </SiteLayout>
    );
  },
});

const fmtDate = (
  iso: string,
  o: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) => new Date(iso).toLocaleDateString(undefined, o);

function SectionHead({
  id,
  eyebrow,
  title,
  sub,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div id={id} className="mb-8 scroll-mt-32 md:mb-10">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">{eyebrow}</div>
      <h2 className="mt-2 font-heading text-3xl font-bold text-ink md:text-4xl">{title}</h2>
      {sub ? <p className="mt-2 max-w-2xl text-body">{sub}</p> : null}
    </div>
  );
}

const PAGE = 6;

function NewsAndEvents() {
  const { data: news } = useSuspenseQuery(newsQ);
  const { data: events } = useSuspenseQuery(eventsQ);
  const [cat, setCat] = useState("all");
  const [more, setMore] = useState(PAGE);
  const [showPast, setShowPast] = useState(false);

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now).reverse();
  const next = upcoming[0];
  const restUpcoming = upcoming.slice(1);

  const cats = useMemo(
    () => Array.from(new Set(news.map((n) => n.category).filter(Boolean) as string[])),
    [news],
  );
  const filtered = cat === "all" ? news : news.filter((n) => n.category === cat);
  const [lead, ...others] = filtered;

  return (
    <SiteLayout>
      <PageHero eyebrow="News & Events" title="Stories, updates, and moments to join.">
        Everything happening at Adey CP — from the latest news to upcoming community events.
        <span className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <a
            href="#news"
            className="rounded-full bg-white/10 px-4 py-2 text-white no-underline transition hover:bg-white/20"
          >
            {news.length} stories
          </a>
          <a
            href="#events"
            className="rounded-full bg-white/10 px-4 py-2 text-white no-underline transition hover:bg-white/20"
          >
            {upcoming.length} upcoming event{upcoming.length === 1 ? "" : "s"}
          </a>
        </span>
      </PageHero>

      {/* ---------------- NEWS ---------------- */}
      <section className="section-pad pb-8">
        <div className="container-adey">
          <SectionHead
            id="news"
            eyebrow="News & Stories"
            title="Latest from Adey CP"
            sub="Updates from our programs, our team and the families we serve."
          />

          {news.length === 0 ? (
            <EmptyState
              icon={<Newspaper className="h-10 w-10" />}
              title="No articles published yet"
              description="Check back soon for the latest stories."
            />
          ) : (
            <>
              {cats.length > 1 ? (
                <div
                  className="no-scrollbar -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 py-1"
                  role="tablist"
                  aria-label="Filter stories"
                >
                  {["all", ...cats].map((c) => (
                    <button
                      key={c}
                      role="tab"
                      type="button"
                      aria-selected={cat === c}
                      onClick={() => {
                        setCat(c);
                        setMore(PAGE);
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        cat === c
                          ? "border-primary bg-primary text-primary-foreground shadow"
                          : "border-border bg-card text-body hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {c === "all" ? "All stories" : c}
                    </button>
                  ))}
                </div>
              ) : null}

              {lead ? (
                <Reveal>
                  <FeaturedNewsCard item={lead} />
                </Reveal>
              ) : null}

              {others.length > 0 ? (
                <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {others.slice(0, more).map((item, i) => (
                    <Reveal key={item.id} delay={(i % 3) * 70}>
                      <NewsCard item={item} />
                    </Reveal>
                  ))}
                </div>
              ) : null}

              {others.length > more ? (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setMore((m) => m + PAGE)}
                    className="btn-outline"
                  >
                    Show more stories ({others.length - more} more)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* ---------------- EVENTS ---------------- */}
      <section className="section-pad bg-muted/40">
        <div className="container-adey">
          <SectionHead
            id="events"
            eyebrow="Events"
            title="Upcoming events"
            sub="Join us — everyone is welcome."
          />

          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-10 w-10" />}
              title="No upcoming events"
              description="New events are announced regularly — check back soon."
            />
          ) : (
            <div className="space-y-5">
              {next ? (
                <Reveal>
                  <NextEventCard item={next} />
                </Reveal>
              ) : null}
              {restUpcoming.map((e, i) => (
                <Reveal key={e.id} delay={(i % 3) * 60}>
                  <EventRow item={e} />
                </Reveal>
              ))}
            </div>
          )}

          {past.length > 0 ? (
            <div className="mt-14">
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                aria-expanded={showPast}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 text-left font-heading text-lg font-bold text-ink transition hover:border-primary/40"
              >
                Past events ({past.length})
                <span
                  className={`text-primary transition-transform ${showPast ? "rotate-45" : ""}`}
                  aria-hidden
                >
                  +
                </span>
              </button>
              {showPast ? (
                <div className="mt-5 space-y-4">
                  {past.map((e) => (
                    <EventRow key={e.id} item={e} muted />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </SiteLayout>
  );
}

function FeaturedNewsCard({ item }: { item: NewsListItem }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: item.slug }}
      className="group relative block overflow-hidden rounded-3xl bg-ink shadow-[var(--shadow-card)] transition duration-500 hover:shadow-[var(--shadow-lifted)]"
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
        {item.cover_image_url ? (
          <MediaImage
            priority
            sizes="(min-width: 1280px) 1200px, 100vw"
            src={item.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-accent/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              Latest story
            </span>
            {item.category ? (
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                {item.category}
              </span>
            ) : null}
            {item.published_at ? (
              <span className="text-xs uppercase tracking-widest text-white/70">
                {fmtDate(item.published_at, { year: "numeric", month: "long", day: "numeric" })}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 max-w-3xl font-heading text-2xl font-bold text-white sm:text-4xl">
            {item.title}
          </h3>
          {item.excerpt ? (
            <p className="mt-3 line-clamp-2 max-w-2xl text-white/85 sm:text-lg">{item.excerpt}</p>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
            Read story{" "}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewsCard({ item }: { item: NewsListItem }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: item.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lifted)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.cover_image_url ? (
          <MediaImage
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            src={item.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/20" />
        )}
        {item.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur">
            {item.category}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {item.published_at ? (
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {fmtDate(item.published_at)}
          </div>
        ) : null}
        <h3 className="mt-2 font-heading text-xl font-bold leading-snug text-ink transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        {item.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm text-body">{item.excerpt}</p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold text-primary">
          Read story{" "}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

function DateBadge({ start, className = "" }: { start: Date; className?: string }) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-2xl bg-primary px-4 py-3 text-center text-primary-foreground ${className}`}
    >
      <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">
        {start.toLocaleDateString(undefined, { month: "short" })}
      </div>
      <div className="font-heading text-3xl font-bold leading-none">{start.getDate()}</div>
      <div className="mt-0.5 text-[11px] opacity-70">{start.getFullYear()}</div>
    </div>
  );
}

function NextEventCard({ item }: { item: EventListItem }) {
  const start = new Date(item.starts_at);
  return (
    <Link
      to="/events/$slug"
      params={{ slug: item.slug }}
      className="group relative block overflow-hidden rounded-3xl bg-brand text-white shadow-[var(--shadow-card)] transition duration-500 hover:shadow-[var(--shadow-lifted)]"
    >
      {item.cover_image_url ? (
        <MediaImage
          sizes="(min-width: 1280px) 1200px, 100vw"
          src={item.cover_image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-[1400ms] group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/95 via-brand/80 to-brand/30" />
      <div className="relative grid gap-6 p-6 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
        <DateBadge start={start} className="w-24 bg-accent text-accent-foreground sm:w-28" />
        <div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">
            Next event
          </span>
          <h3 className="mt-3 font-heading text-2xl font-bold text-white sm:text-4xl">
            {item.title}
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />{" "}
              {start.toLocaleString(undefined, {
                weekday: "long",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            {item.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {item.location}
              </span>
            ) : null}
          </div>
          <Countdown to={item.starts_at} className="mt-5 text-white" />
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
            Event details <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EventRow({ item, muted }: { item: EventListItem; muted?: boolean }) {
  const start = new Date(item.starts_at);
  return (
    <Link
      to="/events/$slug"
      params={{ slug: item.slug }}
      className={`group flex items-stretch gap-4 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lifted)] sm:gap-6 sm:p-5 ${muted ? "opacity-75" : ""}`}
    >
      <DateBadge start={start} className="w-20 sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <h3 className="font-heading text-lg font-bold text-ink transition-colors group-hover:text-primary sm:text-xl">
          {item.title}
        </h3>
        {item.description ? (
          <p className="line-clamp-2 text-sm text-body">{item.description}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />{" "}
            {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
          {item.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {item.location}
            </span>
          ) : null}
        </div>
      </div>
      {item.cover_image_url ? (
        <div className="hidden w-40 shrink-0 overflow-hidden rounded-2xl bg-muted md:block">
          <MediaImage
            sizes="160px"
            src={item.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      ) : null}
      <ArrowUpRight className="hidden h-5 w-5 shrink-0 self-center text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
    </Link>
  );
}
