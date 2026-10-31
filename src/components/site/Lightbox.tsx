import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, ZoomIn, ZoomOut } from "lucide-react";
import { MediaImage } from "./MediaImage";

export type LightboxItem = {
  id: string;
  image_url: string;
  title?: string | null;
  caption?: string | null;
};

const AUTOPLAY_MS = 4500;

/**
 * Full-screen photo viewer: keyboard (←/→/Esc/space), swipe, thumbnail strip,
 * slideshow, click-to-zoom, neighbour preloading, slide animation.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const item = items[index];
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const go = useCallback(
    (to: number) => {
      const n = items.length;
      if (n < 2) return;
      const next = (to + n) % n;
      setDir(to > index || (index === n - 1 && next === 0) ? "next" : "prev");
      setZoom(null);
      onIndex(next);
    },
    [index, items.length, onIndex],
  );

  // Keyboard + scroll lock + initial focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, index, onClose]);

  // Slideshow.
  useEffect(() => {
    if (!playing || items.length < 2) return;
    const t = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, index, items.length, go]);

  // Preload neighbours so the next photo appears instantly.
  useEffect(() => {
    [index + 1, index - 1].forEach((i) => {
      const it = items[(i + items.length) % items.length];
      if (it && items.length > 1) new Image().src = it.image_url;
    });
  }, [index, items]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title ?? "Photo viewer"}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white animate-fade-in"
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tabular-nums">
          {index + 1} / {items.length}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 1 ? (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="lb-btn"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setZoom((z) => (z ? null : { x: 50, y: 50 }))}
            className="lb-btn hidden sm:flex"
            aria-label={zoom ? "Zoom out" : "Zoom in"}
          >
            {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="lb-btn"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* stage */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-16"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || zoom) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) onClose();
        }}
        style={{ touchAction: "pan-y" }}
      >
        {items.length > 1 ? (
          <>
            <button
              type="button"
              className="lb-btn absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 sm:left-4 sm:flex"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="lb-btn absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 sm:right-4 sm:flex"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}

        <figure
          key={item.id}
          className={`lb-slide lb-${dir} flex max-h-full max-w-full flex-col items-center`}
        >
          <div className="relative flex min-h-[40vh] min-w-[60vw] items-center justify-center overflow-hidden rounded-xl sm:min-w-0">
            <div className="absolute h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            <MediaImage
              src={item.image_url}
              alt={item.title ?? ""}
              priority
              sizes="100vw"
              draggable={false}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setZoom((z) =>
                  z
                    ? null
                    : {
                        x: ((e.clientX - r.left) / r.width) * 100,
                        y: ((e.clientY - r.top) / r.height) * 100,
                      },
                );
              }}
              style={
                zoom
                  ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
              className={`relative max-h-[68vh] w-auto max-w-full select-none object-contain transition-transform duration-300 ${
                zoom ? "cursor-zoom-out" : "cursor-zoom-in"
              }`}
            />
          </div>
          {item.title || item.caption ? (
            <figcaption className="mt-4 max-w-2xl px-4 text-center">
              {item.title ? (
                <div className="font-heading text-lg font-bold">{item.title}</div>
              ) : null}
              {item.caption ? (
                <div className="mt-1 text-sm text-white/70">{item.caption}</div>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      </div>

      {/* thumbnails */}
      {items.length > 1 ? (
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-6"
        >
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              data-i={i}
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition sm:h-16 sm:w-16 ${
                i === index
                  ? "opacity-100 ring-accent"
                  : "opacity-50 ring-transparent hover:opacity-90"
              }`}
            >
              <MediaImage
                src={it.image_url}
                alt=""
                sizes="64px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
