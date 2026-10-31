import { useEffect, useState } from "react";
import { X, Camera, Images, ArrowUpRight } from "lucide-react";
import type { GalleryItemPublic } from "@/lib/cms-public";
import { MediaImage } from "./MediaImage";
import { Lightbox } from "./Lightbox";
import { PhotoMosaic } from "./PhotoMosaic";

export type Album = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  items: GalleryItemPublic[];
};

/** A single album card: one thumbnail + a photo-count badge, like a stacked
 * photo pile. Click opens the full AlbumViewer with every photo. */
export function AlbumCard({
  album,
  onOpen,
  large,
}: {
  album: Album;
  onOpen: () => void;
  large?: boolean;
}) {
  const cover = album.cover_image_url || album.items[0]?.image_url;
  const total = album.items.length;
  if (!cover) return null;

  return (
    <button
      onClick={onOpen}
      className="group h-full w-full text-left outline-offset-4"
      aria-label={`Open album ${album.name} (${total} photo${total === 1 ? "" : "s"})`}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-3xl bg-muted shadow-[var(--shadow-card)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lifted)] ${large ? "" : "aspect-square"}`}
      >
        {/* stacked-photo effect when there's more than one image */}
        {total > 1 ? (
          <>
            <div className="absolute inset-1 -rotate-3 rounded-xl bg-card/60 ring-1 ring-border" />
            <div className="absolute inset-1 rotate-2 rounded-xl bg-card/80 ring-1 ring-border" />
          </>
        ) : null}
        <MediaImage
          sizes="(min-width: 1024px) 300px, 50vw"
          src={cover}
          alt={album.name}
          className="relative h-full w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        {large ? (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
            Featured Album
          </span>
        ) : null}
        {total > 0 ? (
          <div className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <Images className="h-3.5 w-3.5" /> {total > 99 ? "99+" : total}
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <div
            className={`font-heading font-bold text-white drop-shadow ${large ? "text-xl md:text-2xl" : "text-sm sm:text-base"}`}
          >
            {album.name}
          </div>
          {large && album.description ? (
            <div className="mt-1 line-clamp-1 text-sm text-white/80">{album.description}</div>
          ) : null}
          <div className="mt-1.5 hidden items-center gap-1 text-xs font-bold uppercase tracking-wider text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex">
            View album <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

/** Full-screen "compartment" showing every photo in an album, title at top. */
export function AlbumViewer({ album, onClose }: { album: Album; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-8">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Album</div>
          <h2 className="truncate font-heading text-xl font-bold text-ink sm:text-2xl">
            {album.name}
          </h2>
          {album.description ? (
            <p className="mt-0.5 line-clamp-1 text-sm text-body">{album.description}</p>
          ) : null}
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-muted"
          aria-label="Close album"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {album.items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No photos in this album yet.</p>
        ) : (
          <div className="mx-auto max-w-6xl">
            <PhotoMosaic items={album.items} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PhotoLightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: GalleryItemPublic[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  return <Lightbox items={items} index={index} onClose={onClose} onIndex={onIndex} />;
}

export { Camera };
