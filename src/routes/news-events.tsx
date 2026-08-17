import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Newspaper, CalendarDays, MapPin, ArrowUpRight } from "lucide-react";
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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {news.map((item) => <NewsCard key={item.id} item={item} />)}
              </div>
            )
          ) : (
            <div className="space-y-14">
              <div>
                <h2 className="mb-6 font-heading text-2xl font-bold text-ink">Upcoming</h2>
                {upcoming.length === 0 ? (
                  <EmptyState icon={<CalendarDays className="h-10 w-10" />} title="No upcoming events" description="New events are announced regularly — check back soon." />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map((e) => <EventCard key={e.id} item={e} />)}
                  </div>
                )}
              </div>
              {past.length > 0 ? (
                <div>
                  <h2 className="mb-6 font-heading text-2xl font-bold text-ink">Past events</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {past.map((e) => <EventCard key={e.id} item={e} muted />)}
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

function EventCard({ item, muted }: { item: EventListItem; muted?: boolean }) {
  return (
    <Link
      to="/events/$slug"
      params={{ slug: item.slug }}
      className={`group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-lg ${muted ? "opacity-80" : ""}`}
    >
      {item.cover_image_url ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
          <img src={item.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/10 to-accent/20" />
      )}
      <div className="p-5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
          {new Date(item.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          {" · "}
          {new Date(item.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
        <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary">{item.title}</h3>
        {item.description ? <p className="mt-2 line-clamp-2 text-sm text-body">{item.description}</p> : null}
        {item.location ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {item.location}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
