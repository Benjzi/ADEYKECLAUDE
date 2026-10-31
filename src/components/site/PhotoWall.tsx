import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Rows3, Maximize2 } from "lucide-react";
import type { GalleryItemPublic } from "@/lib/cms-public";
import { MediaImage } from "./MediaImage";
import { Lightbox } from "./Lightbox";
import type { Album } from "./GalleryAlbum";

type View = "mosaic" | "grid";
const VIEW_KEY = "adeycp-gallery-view";

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

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "mosaic";
  } catch {
    return "mosaic";
  }
}

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

/** Filterable photo wall: every photo at once, with album chips on top. */
export function PhotoWall({ albums }: { albums: Album[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<View>("mosaic");
  const [open, setOpen] = useState<number | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  useEffect(() => setView(readView()), []);

  const all = useMemo(() => {
    const seen = new Set<string>();
    return albums
      .flatMap((a) => a.items)
      .filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
  }, [albums]);

  const shown = useMemo(() => {
    const base = filter === "all" ? all : (albums.find((a) => a.id === filter)?.items ?? []);
    return base.filter((it) => !broken.has(it.id));
  }, [filter, all, albums, broken]);

  function pickView(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  }

  const chips = [{ id: "all", name: "All photos", count: all.length }].concat(
    albums.map((a) => ({ id: a.id, name: a.name, count: a.items.length })),
  );

  return (
    <>
      {/* sticky filter bar (sits under the 4rem site header) */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Filter photos by album"
            className="no-scrollbar -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-0.5"
          >
            {chips.map((c) => {
              const active = filter === c.id;
              return (
                <button
                  key={c.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setFilter(c.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card text-body hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {c.name}
                  <span
                    className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                      active ? "bg-white/20" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            className="hidden shrink-0 gap-1 rounded-full border border-border bg-card p-1 sm:flex"
            role="group"
            aria-label="Layout"
          >
            {(
              [
                ["mosaic", Rows3, "Mosaic layout"],
                ["grid", LayoutGrid, "Even grid layout"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                aria-label={label}
                aria-pressed={view === v}
                onClick={() => pickView(v)}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {shown.length} photo{shown.length === 1 ? "" : "s"}
        {filter !== "all" ? ` in ${albums.find((a) => a.id === filter)?.name}` : ""}
      </p>

      <div
        key={`${filter}-${view}`}
        className={`mt-4 grid grid-flow-dense grid-cols-2 gap-3 sm:gap-4 ${
          view === "mosaic"
            ? "auto-rows-[150px] sm:grid-cols-3 sm:auto-rows-[190px] lg:grid-cols-4 lg:auto-rows-[220px]"
            : "auto-rows-auto sm:grid-cols-3 lg:grid-cols-4 [&>button]:aspect-square"
        }`}
      >
        {shown.map((item, i) => (
          <Tile
            key={item.id}
            item={item}
            i={i}
            view={view}
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
