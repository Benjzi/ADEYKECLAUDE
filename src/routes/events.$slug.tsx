import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Clock,
  ExternalLink,
  MapPin,
  Images,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getPublishedEvent, listEventGalleryAlbums } from "@/lib/cms-public";
import { Countdown } from "@/components/site/Countdown";
import { downloadIcs, googleCalendarUrl } from "@/lib/calendar";
import { AlbumCard, AlbumViewer, type Album } from "@/components/site/GalleryAlbum";
import { MediaImage } from "@/components/site/MediaImage";

const eventQuery = (slug: string) =>
  queryOptions({
    queryKey: ["events", "public", slug],
    queryFn: () => getPublishedEvent({ data: { slug } }),
  });

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — Adey CP Events` : "Event — Adey CP";
    const desc = loaderData?.description ?? "Adey CP event details.";
    const image = loaderData?.cover_image_url ?? undefined;
    const meta = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "event" },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta };
  },
  component: EventDetail,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-adey py-24 text-center">
        <h1>Event not found</h1>
        <Link to="/news-events" className="btn-primary mt-6 inline-block">
          Back to Events
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="container-adey py-24 text-center">
          <h1>Something went wrong</h1>
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

function EventDetail() {
  const { slug } = Route.useParams();
  const { data: ev } = useSuspenseQuery(eventQuery(slug));
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: albumData } = useQuery({
    queryKey: ["public", "event-albums", ev?.id],
    queryFn: () => listEventGalleryAlbums(ev!.id),
    enabled: !!ev?.id,
  });

  const albums = useMemo<Album[]>(() => {
    if (!albumData) return [];
    const byCat = new Map<string, Album>();
    for (const c of albumData.categories)
      byCat.set(c.id, {
        id: c.id,
        name: c.name,
        description: c.description,
        cover_image_url: c.cover_image_url,
        items: [],
      });
    for (const it of albumData.items)
      if (it.category_id && byCat.has(it.category_id)) byCat.get(it.category_id)!.items.push(it);
    return Array.from(byCat.values()).filter((a) => a.items.length > 0);
  }, [albumData]);

  const openAlbum = albums.find((a) => a.id === openId) ?? null;

  if (!ev) return null;
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : null;
  const isPast = (end ?? start).getTime() < Date.now();

  const facts = [
    {
      icon: CalendarDays,
      label: "Date",
      value: start.toLocaleDateString(undefined, { dateStyle: "full" }),
    },
    {
      icon: Clock,
      label: "Time",
      value:
        start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) +
        (end
          ? ` – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
          : ""),
    },
    ev.location ? { icon: MapPin, label: "Where", value: ev.location } : null,
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[];

  return (
    <SiteLayout>
      {/* hero */}
      <section className="relative isolate overflow-hidden bg-brand text-white">
        {ev.cover_image_url ? (
          <MediaImage
            priority
            sizes="100vw"
            src={ev.cover_image_url}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-deep via-brand/70 to-brand/40" />
        <div className="container-adey py-12 md:py-20">
          <Link
            to="/news-events"
            hash="events"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 no-underline hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All events
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                isPast ? "bg-white/20" : "bg-accent text-accent-foreground"
              }`}
            >
              {isPast ? "Past event" : "Upcoming"}
            </span>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold text-white md:text-5xl">{ev.title}</h1>
          {!isPast ? <Countdown to={ev.starts_at} className="mt-6 text-white" /> : null}
        </div>
      </section>

      <article className="container-adey py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            {ev.description ? (
              <p className="text-xl leading-relaxed text-ink">{ev.description}</p>
            ) : null}
            <div className="prose prose-lg mt-6 max-w-3xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{ev.body || ""}</ReactMarkdown>
            </div>
          </div>

          {/* sticky details card */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-lg font-bold text-ink">Event details</h2>
              <dl className="mt-4 space-y-4">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </dt>
                      <dd className="text-sm font-semibold text-ink">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {ev.rsvp_url && !isPast ? (
                <a
                  href={ev.rsvp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent mt-6 w-full"
                >
                  RSVP <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              {!isPast ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={googleCalendarUrl(ev)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline btn-sm"
                  >
                    <CalendarPlus className="h-4 w-4" /> Google
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadIcs(ev, ev.slug)}
                    className="btn-outline btn-sm"
                  >
                    <CalendarPlus className="h-4 w-4" /> Apple / Outlook
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        {albums.length > 0 ? (
          <div className="mt-14 border-t border-border pt-10">
            <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-ink">
              <Images className="h-6 w-6 text-primary" /> Photos from this event
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} onOpen={() => setOpenId(album.id)} />
              ))}
            </div>
          </div>
        ) : null}
      </article>

      {openAlbum ? <AlbumViewer album={openAlbum} onClose={() => setOpenId(null)} /> : null}
    </SiteLayout>
  );
}
