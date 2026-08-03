import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, ExternalLink } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getPublishedEvent, listEventGalleryAlbums } from "@/lib/cms-public";
import { AlbumCard, AlbumViewer, type Album } from "@/components/site/GalleryAlbum";

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
        <Link to="/events" className="btn-primary mt-6 inline-block">Back to Events</Link>
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
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary mt-6">Try again</button>
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
    for (const c of albumData.categories) byCat.set(c.id, { id: c.id, name: c.name, description: c.description, cover_image_url: c.cover_image_url, items: [] });
    for (const it of albumData.items) if (it.category_id && byCat.has(it.category_id)) byCat.get(it.category_id)!.items.push(it);
    return Array.from(byCat.values()).filter((a) => a.items.length > 0);
  }, [albumData]);

  const openAlbum = albums.find((a) => a.id === openId) ?? null;

  if (!ev) return null;
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : null;

  return (
    <SiteLayout>
      <article className="container-adey py-12 md:py-16">
        <Link to="/events" className="text-sm font-semibold text-primary hover:underline">← All Events</Link>
        <header className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-bold md:text-4xl">{ev.title}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-body">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />
              {start.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
              {end ? ` – ${end.toLocaleString(undefined, { timeStyle: "short" })}` : ""}
            </div>
            {ev.location ? <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{ev.location}</div> : null}
          </div>
          {ev.rsvp_url ? (
            <a href={ev.rsvp_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 inline-flex items-center gap-2">
              RSVP <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </header>
        {ev.cover_image_url ? (
          <img src={ev.cover_image_url} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-[var(--shadow-card)]" />
        ) : null}
        {ev.description ? (
          <p className="mt-8 max-w-3xl text-lg text-body">{ev.description}</p>
        ) : null}
        <div className="prose prose-lg mt-6 max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{ev.body || ""}</ReactMarkdown>
        </div>

        {albums.length > 0 ? (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="font-heading text-xl font-bold text-ink">Photos from this event</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:max-w-2xl">
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
