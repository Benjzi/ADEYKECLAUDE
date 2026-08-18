import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Newspaper, CalendarDays, MapPin, ArrowUpRight, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, EmptyState } from "@/components/site/PageHero";
import { listPublishedNews, listPublishedEvents, type NewsListItem, type EventListItem } from "@/lib/cms-public";

const newsQ = queryOptions({ queryKey: ["news", "public", "list"], queryFn: () => listPublishedNews() });
const eventsQ = queryOptions({ queryKey: ["events", "public", "list"], queryFn: () => listPublishedEvents() });

export const Route = createFileRoute("/news-events")({
  head: () => ({
    meta: [
      { title: "News & Events — Adey CP" },
      { name: "description", content: "Latest news, stories, and upcoming events from Adey CP Humanitarian Association." },
      { property: "og:title", content: "News & Events — Adey CP" },
    ],
  }),
  loader: ({ context }) => Promise.all([
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
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary mt-6">Try again</button>
        </div>
      </SiteLayout>
    );
  },
});

function NewsAndEvents() {
  const { data: news } = useSuspenseQuery(newsQ);
  const { data: events } = useSuspenseQuery(eventsQ);
  const [tab, setTab] = useState<"news" | "events">("news");

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now).reverse();

  return (
    <SiteLayout>
      <PageHero eyebrow="News & Events" title="Stories, updates, and moments to join.">
        Everything happening at Adey CP — from the latest news to upcoming community events.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey">
          <div className="mb-10 inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => setTab("news")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${tab === "news" ? "bg-primary text-primary-foreground shadow" : "text-body hover:text-primary"}`}
            >
              <Newspaper className="h-4 w-4" /> News <span className="opacity-70">({news.length})</span>
            </button>
            <button
              onClick={() => setTab("events")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${tab === "events" ? "bg-primary text-primary-foreground shadow" : "text-body hover:text-primary"}`}
            >
              <CalendarDays className="h-4 w-4" /> Events <span className="opacity-70">({events.length})</span>
            </button>
          </div>

          {tab === "news" ? (
            news.length === 0 ? (
              <EmptyState icon={<Newspaper className="h-10 w-10" />} title="No articles published yet" description="Check back soon for the latest stories." />
            ) : (
              <div className="space-y-8">
                <FeaturedNewsCard item={news[0]} />
                {news.length > 1 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {news.slice(1).map((item) => <NewsCard key={item.id} item={item} />)}
                  </div>
                ) : null}
              </div>
            )
          ) : (
            <div className="space-y-14">
              <div>
                <h2 className="mb-6 font-heading text-2xl font-bold text-ink">Upcoming</h2>
                {upcoming.length === 0 ? (
                  <EmptyState icon={<CalendarDays className="h-10 w-10" />} title="No upcoming events" description="New events are announced regularly — check back soon." />
                ) : (
                  <div className="space-y-4">
                    {upcoming.map((e) => <EventRow key={e.id} item={e} />)}
                  </div>
                )}
              </div>
              {past.length > 0 ? (
                <div>
                  <h2 className="mb-6 font-heading text-2xl font-bold text-ink">Past events</h2>
                  <div className="space-y-4">
                    {past.map((e) => <EventRow key={e.id} item={e} muted />)}
                  </div>
                </div>
              ) : null}
            </div>
          )}
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
      className="group relative grid overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition duration-500 hover:shadow-[var(--shadow-lifted)] md:grid-cols-2"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted md:aspect-auto md:min-h-[360px]">
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r" />
      </div>
      <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
          Latest Story
        </div>
        {item.category ? <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span> : null}
        <h2 className="font-heading text-3xl font-bold text-ink transition-colors group-hover:text-primary md:text-4xl">{item.title}</h2>
        {item.excerpt ? <p className="line-clamp-3 text-body">{item.excerpt}</p> : null}
        <div className="flex items-center justify-between pt-2">
          {item.published_at ? (
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {new Date(item.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </div>
          ) : <span />}
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read story <ArrowUpRight className="h-4 w-4" />
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
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lifted)]"
    >
      {item.cover_image_url ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
          <img src={item.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/10 to-accent/20" />
      )}
      <div className="p-5">
        {item.category ? <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-foreground/80">{item.category}</div> : null}
        <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary">{item.title}</h3>
        {item.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-body">{item.excerpt}</p> : null}
        <div className="mt-4 flex items-center justify-between">
          {item.published_at ? (
            <div className="text-xs text-muted-foreground">{new Date(item.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
          ) : <span />}
          <ArrowUpRight className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
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
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lifted)] sm:flex-row ${muted ? "opacity-75" : ""}`}
    >
      {/* Calendar-style date block */}
      <div className="flex shrink-0 flex-row items-center gap-4 bg-primary-soft/50 p-5 sm:w-32 sm:flex-col sm:justify-center sm:gap-0 sm:border-r sm:border-border">
        <div className="font-heading text-3xl font-bold text-primary sm:text-4xl">{start.getDate()}</div>
        <div className="text-xs font-bold uppercase tracking-widest text-primary/80">
          {start.toLocaleDateString(undefined, { month: "short" })} {start.getFullYear()}
        </div>
      </div>

      {item.cover_image_url ? (
        <div className="h-40 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-56">
          <img src={item.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col justify-center gap-2 p-5">
        <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary">{item.title}</h3>
        {item.description ? <p className="line-clamp-2 text-sm text-body">{item.description}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
          {item.location ? <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.location}</span> : null}
        </div>
      </div>

      <div className="hidden items-center pr-6 sm:flex">
        <ArrowUpRight className="h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}
