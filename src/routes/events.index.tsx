import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, EmptyState } from "@/components/site/PageHero";
import { listPublishedEvents, type EventListItem } from "@/lib/cms-public";

const eventsQuery = queryOptions({
  queryKey: ["events", "public", "list"],
  queryFn: () => listPublishedEvents(),
});

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events — Adey CP" },
      { name: "description", content: "Upcoming and past events from Adey CP Humanitarian Association." },
      { property: "og:title", content: "Events — Adey CP" },
      { property: "og:description", content: "Upcoming and past events." },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: Events,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="container-adey py-24 text-center">
          <h1>Events couldn't load</h1>
          <p className="mt-2 text-body">{error.message}</p>
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary mt-6">Try again</button>
        </div>
      </SiteLayout>
    );
  },
});

function Events() {
  const { data: items } = useSuspenseQuery(eventsQuery);
  const now = Date.now();
  const upcoming = items.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = items.filter((e) => new Date(e.starts_at).getTime() < now).reverse();

  return (
    <SiteLayout>
      <PageHero eyebrow="Events" title="Come and be part of the story.">
        Family days, fundraisers, awareness walks, and community workshops.
      </PageHero>
      <section className="section-pad">
        <div className="container-adey space-y-14">
          <section>
            <h2 className="mb-6 font-heading text-2xl font-bold text-ink">Upcoming</h2>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-10 w-10" />}
                title="No upcoming events"
                description="New events are announced regularly — check back soon."
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => <EventCard key={e.id} item={e} />)}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section>
              <h2 className="mb-6 font-heading text-2xl font-bold text-ink">Past events</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {past.map((e) => <EventCard key={e.id} item={e} muted />)}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </SiteLayout>
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
