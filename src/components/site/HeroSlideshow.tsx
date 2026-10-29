import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaImage } from "./MediaImage";

export function HeroSlideshow({ images, altPrefix }: { images: string[]; altPrefix: string }) {
  const [index, setIndex] = useState(0);
  const slides = images.length > 0 ? images : [];
  // Only the slides a visitor will actually see soon get an <img> tag at
  // all — mounting every slide up front (even with loading="lazy") made
  // the browser fetch all of them simultaneously, since they're all
  // stacked in the same viewport-sized box. This keeps it to the current
  // slide plus its immediate neighbors, growing as the user reaches more.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setMounted((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % slides.length);
      return next;
    });
  }, [index, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  // The slide-to-slide crossfade only applies once the slideshow has actually
  // moved. The first slide must appear the instant its image has arrived, not
  // fade in over 1.4 s after it is already downloaded.
  const moved = useRef(false);
  if (index !== 0) moved.current = true;

  if (slides.length === 0) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {slides.map((src, i) =>
        mounted.has(i) ? (
          // Keyed by position, not URL: a refreshed signed URL for the same
          // slide must update the existing <img>, not unmount/remount it
          // (which restarted the download and the paint).
          <MediaImage
            key={i}
            src={src}
            alt={`${altPrefix} ${i + 1}`}
            priority={i === 0}
            className={`absolute inset-0 h-full w-full object-cover ${moved.current ? "transition-all duration-[1400ms] ease-out motion-reduce:transition-none" : ""} ${
              i === index
                ? "translate-x-0 opacity-100 scale-105"
                : i < index
                  ? "-translate-x-6 opacity-0"
                  : "translate-x-6 opacity-0"
            }`}
          />
        ) : null,
      )}
      {slides.length > 1 ? (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous photo"
            className="absolute right-16 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 p-2 text-white backdrop-blur transition hover:bg-black/40 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 p-2 text-white backdrop-blur transition hover:bg-black/40 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Show slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-7 bg-accent" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
