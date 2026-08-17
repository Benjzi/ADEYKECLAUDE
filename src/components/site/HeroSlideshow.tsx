import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HeroSlideshow({ images, altPrefix }: { images: string[]; altPrefix: string }) {
  const [index, setIndex] = useState(0);
  const slides = images.length > 0 ? images : [];

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {slides.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={`${altPrefix} ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out ${
            i === index ? "translate-x-0 opacity-100 scale-105" : i < index ? "-translate-x-6 opacity-0" : "translate-x-6 opacity-0"
          }`}
        />
      ))}
      {slides.length > 1 ? (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous photo"
            className="absolute right-16 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 p-2 text-white backdrop-blur transition hover:bg-black/40 md:flex"
          ><ChevronLeft className="h-5 w-5" /></button>
          <button
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 p-2 text-white backdrop-blur transition hover:bg-black/40 md:flex"
          ><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
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
