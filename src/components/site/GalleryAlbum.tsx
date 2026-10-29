import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Camera, Images } from "lucide-react";
import type { GalleryItemPublic } from "@/lib/cms-public";
import { MediaImage } from "./MediaImage";

export type Album = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  items: GalleryItemPublic[];
};

/** A single album card: one thumbnail + a photo-count badge, like a stacked
 * photo pile. Click opens the full AlbumViewer with every photo. */
export function AlbumCard({ album, onOpen, large }: { album: Album; onOpen: () => void; large?: boolean }) {
  const cover = album.cover_image_url || album.items[0]?.image_url;
  const total = album.items.length;
  if (!cover) return null;

  return (
    <button
      onClick={onOpen}
      className="group h-full w-full text-left"
      aria-label={`Open album ${album.name} (${total} photo${total === 1 ? "" : "s"})`}
    >
      <div className={`relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-card)] ${large ? "" : "aspect-square"}`}>
        {/* stacked-photo effect when there's more than one image */}
        {total > 1 ? (
          <>
            <div className="absolute inset-1 -rotate-3 rounded-xl bg-card/60 ring-1 ring-border" />
            <div className="absolute inset-1 rotate-2 rounded-xl bg-card/80 ring-1 ring-border" />
          </>
        ) : null}
        <MediaImage sizes="(min-width: 1024px) 300px, 50vw"
          src={cover}
          alt={album.name}
          className="relative h-full w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/65 via-black/0 to-transparent" />
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
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className={`font-heading font-bold text-white drop-shadow ${large ? "text-xl md:text-2xl" : "text-sm sm:text-base"}`}>{album.name}</div>
          {large && album.description ? <div className="mt-1 line-clamp-1 text-sm text-white/80">{album.description}</div> : null}
        </div>
      </div>
    </button>
  );
}

/** Full-screen "compartment" showing every photo in an album, title at top. */
export function AlbumViewer({ album, onClose }: { album: Album; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightbox !== null) setLightbox(null);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-8">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Album</div>
          <h2 className="truncate font-heading text-xl font-bold text-ink sm:text-2xl">{album.name}</h2>
          {album.description ? <p className="mt-0.5 line-clamp-1 text-sm text-body">{album.description}</p> : null}
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
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {album.items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setLightbox(idx)}
                className="group aspect-square overflow-hidden rounded-xl bg-muted"
              >
                <MediaImage sizes="(min-width: 1024px) 300px, 50vw"
                  src={item.image_url}
                  alt={item.title ?? album.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && album.items[lightbox] ? (
        <PhotoLightbox items={album.items} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      ) : null}
    </div>
  );
}

export function PhotoLightbox({
  items, index, onClose, onIndex,
}: {
  items: GalleryItemPublic[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const item = items[index];
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onIndex, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-fade-in" onClick={onClose}>
      <button
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      ><X className="h-6 w-6" /></button>
      <button
        type="button"
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30"
        disabled={!canPrev}
        onClick={(e) => { e.stopPropagation(); if (canPrev) onIndex(index - 1); }}
        aria-label="Previous"
      ><ChevronLeft className="h-6 w-6" /></button>
      <button
        type="button"
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30"
        disabled={!canNext}
        onClick={(e) => { e.stopPropagation(); if (canNext) onIndex(index + 1); }}
        aria-label="Next"
      ><ChevronRight className="h-6 w-6" /></button>
      <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <img src={item.image_url} alt={item.title ?? ""} className="max-h-[80vh] w-auto rounded-lg" decoding="async" />
        {(item.title || item.caption) ? (
          <figcaption className="mt-4 text-center text-white/90">
            {item.title ? <div className="font-heading text-lg font-bold">{item.title}</div> : null}
            {item.caption ? <div className="mt-1 text-sm text-white/70">{item.caption}</div> : null}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}

export { Camera };
