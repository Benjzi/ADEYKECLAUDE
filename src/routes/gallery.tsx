import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Image as ImageIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, EmptyState } from "@/components/site/PageHero";
import { listPublicGallery } from "@/lib/cms-public";
import type { Album } from "@/components/site/GalleryAlbum";
import { PhotoWall } from "@/components/site/PhotoWall";

const galleryQuery = queryOptions({
  queryKey: ["public", "gallery"],
  queryFn: () => listPublicGallery(),
});

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Adey CP" },
      {
        name: "description",
        content:
          "Photos from Adey CP's therapy sessions, events, and community programs across Ethiopia.",
      },
      { property: "og:title", content: "Gallery — Adey CP" },
      { property: "og:description", content: "Photos from Adey CP's programs across Ethiopia." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQuery),
  component: Gallery,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="section-pad container-adey text-center text-destructive">{error.message}</div>
    </SiteLayout>
  ),
});

function Gallery() {
  const { data } = useSuspenseQuery(galleryQuery);

  const albums = useMemo<Album[]>(() => {
    const byCat = new Map<string, Album>();
    for (const c of data.categories)
      byCat.set(c.id, {
        id: c.id,
        name: c.name,
        description: c.description,
        cover_image_url: c.cover_image_url,
        items: [],
      });
    const uncategorized: Album = {
      id: "_uncat",
      name: "Highlights",
      description: null,
      cover_image_url: null,
      items: [],
    };
    for (const it of data.items) {
      if (it.category_id && byCat.has(it.category_id)) byCat.get(it.category_id)!.items.push(it);
      else uncategorized.items.push(it);
    }
    const list = Array.from(byCat.values()).filter((a) => a.items.length > 0);
    if (uncategorized.items.length > 0) list.unshift(uncategorized);
    return list;
  }, [data]);

  return (
    <SiteLayout>
      <PageHero eyebrow="Gallery" title="Moments from our community.">
        Every smile, every session, every step forward — captured with the families who make Adey CP
        what it is.
        <span className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-white">
          <span className="rounded-full bg-white/10 px-4 py-1.5">{data.items.length} photos</span>
          <span className="rounded-full bg-white/10 px-4 py-1.5">
            {albums.length} album{albums.length === 1 ? "" : "s"}
          </span>
        </span>
      </PageHero>
      <section className="section-pad pt-8 md:pt-10">
        <div className="container-adey">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-10 w-10" />}
              title="No photos yet"
              description="Once photos are uploaded from the admin panel, they'll appear here."
            />
          ) : (
            <PhotoWall albums={albums} />
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
