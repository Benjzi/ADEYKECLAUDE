import { useState } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

/** Pulls the video ID out of any common YouTube URL shape
 * (watch?v=, youtu.be/, /embed/, /shorts/) or a bare ID. */
export function youTubeId(url: string): string | null {
  if (!url) return null;
  const s = url.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([\w-]{11})/) ||
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/\/embed\/([\w-]{11})/) ||
    s.match(/\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

export function FeaturedVideos({
  videos,
  heading,
}: {
  videos: { title: string; url: string }[];
  heading?: string | null;
}) {
  const valid = videos
    .map((v) => ({ ...v, id: youTubeId(v.url) }))
    .filter((v): v is { title: string; url: string; id: string } => !!v.id);

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (valid.length === 0) return null;

  const current = valid[Math.min(active, valid.length - 1)];
  const multiple = valid.length > 1;

  function select(i: number) {
    setActive(i);
    setPlaying(false);
  }

  return (
    <section className="section-pad bg-muted/40">
      <div className="container-adey">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Featured</div>
          <h2 className="mt-3 text-3xl md:text-4xl">{heading || "Watch our story"}</h2>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-black shadow-[var(--shadow-lifted)]">
            {playing ? (
              <iframe
                key={current.id}
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0&modestbranding=1`}
                title={current.title || "Featured video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button
                onClick={() => setPlaying(true)}
                className="group relative h-full w-full"
                aria-label={`Play ${current.title || "video"}`}
              >
                {/* Lazy: show YouTube's thumbnail until the user actually
                    clicks, instead of loading the full player up front. */}
                <img
                  src={`https://i.ytimg.com/vi/${current.id}/maxresdefault.jpg`}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${current.id}/hqdefault.jpg`; }}
                  alt={current.title || "Video thumbnail"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/10" />
                <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl transition group-hover:scale-110">
                  <Play className="ml-0.5 h-7 w-7 fill-current" />
                </span>
              </button>
            )}

            {multiple ? (
              <>
                <button
                  onClick={() => select((active - 1 + valid.length) % valid.length)}
                  aria-label="Previous video"
                  className="absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 sm:flex"
                ><ChevronLeft className="h-5 w-5" /></button>
                <button
                  onClick={() => select((active + 1) % valid.length)}
                  aria-label="Next video"
                  className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 sm:flex"
                ><ChevronRight className="h-5 w-5" /></button>
              </>
            ) : null}
          </div>

          {current.title ? (
            <div className="mt-4 text-center font-heading text-lg font-bold text-ink">{current.title}</div>
          ) : null}

          {/* Thumbnail strip — only when there's more than one video */}
          {multiple ? (
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {valid.map((v, i) => (
                <button
                  key={v.id + i}
                  onClick={() => select(i)}
                  aria-label={`Play ${v.title || `video ${i + 1}`}`}
                  className={`group relative overflow-hidden rounded-xl border-2 transition ${
                    i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                    alt={v.title || `Video ${i + 1}`}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/10">
                    <Play className="h-5 w-5 fill-white text-white drop-shadow" />
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
