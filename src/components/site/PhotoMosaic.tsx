import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import type { GalleryItemPublic } from "@/lib/cms-public";
import { MediaImage } from "./MediaImage";
import { Lightbox } from "./Lightbox";

type View = "mosaic" | "grid";

/** Repeating "bento" rhythm: feature tile, tall, wide, small ones. Fixed
 * aspect cells mean nothing shifts while images load. */
const MOSAIC = [
  "col-span-2 row-span-2", // feature
  "",
  "row-span-2", // tall
  "",
  "col-span-2", // wide
  "",
  "",
  "row-span-2",
  "",
  "col-span-2",
];
const MOSAIC_SIZES = [
  "(min-width:1024px) 50vw, 100vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 50vw, 100vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 25vw, 50vw",
  "(min-width:1024px) 50vw, 100vw",
];

function Tile({
  item,
  i,
  view,
  onOpen,
  onFail,
}: {
  item: GalleryItemPublic;
  i: number;
  view: View;
  onOpen: () => void;
  onFail: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);

  // Reveal as it scrolls into view. Without IntersectionObserver the tile is
  // simply shown, so nothing can stay invisible.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const span = view === "mosaic" ? MOSAIC[i % MOSAIC.length] : "";
  const sizes =
    view === "mosaic" ? MOSAIC_SIZES[i % MOSAIC_SIZES.length] : "(min-width:1024px) 25vw, 50vw";
  const label = item.title || item.caption;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={label ? `Open photo: ${label}` : "Open photo"}
      style={{ transitionDelay: `${(i % 8) * 45}ms` }}
      className={`reveal group relative overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-card)] outline-offset-2 ${span}`}
    >
      <div
        className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-border/60"
        aria-hidden
      />
      <MediaImage
        src={item.image_url}
        alt={item.title ?? ""}
        sizes={sizes}
        priority={i < 4}
        onFail={onFail}
        className="relative h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-70 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100" />
      {label ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-0 p-3 text-left text-white transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <div className="line-clamp-2 font-heading text-sm font-bold drop-shadow sm:text-base">
            {label}
          </div>
        </div>
      ) : null}
      <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
        <Maximize2 className="h-4 w-4" />
      </span>
    </button>
  );
}

/** Bento-shaped photo grid for one album: feature, tall and wide tiles, with
 * scroll-reveal and the full-screen lightbox. */
export function PhotoMosaic({ items }: { items: GalleryItemPublic[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const shown = useMemo(() => items.filter((it) => !broken.has(it.id)), [items, broken]);

  return (
    <>
      <div className="grid auto-rows-[140px] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[180px] sm:grid-cols-3 sm:gap-4 lg:auto-rows-[210px] lg:grid-cols-4">
        {shown.map((item, i) => (
          <Tile
            key={item.id}
            item={item}
            i={i}
            view="mosaic"
            onOpen={() => setOpen(i)}
            onFail={() => setBroken((b) => new Set(b).add(item.id))}
          />
        ))}
      </div>
      {open !== null && shown[open] ? (
        <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
      ) : null}
    </>
  );
}
