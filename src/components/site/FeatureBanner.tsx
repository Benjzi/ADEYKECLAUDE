import { useState } from "react";
import { Expand } from "lucide-react";
import { useSiteSettings } from "@/lib/site-settings";
import { MediaImage } from "./MediaImage";

/**
 * Admin-managed homepage banner (blueprint / master plan / announcement).
 * Content comes entirely from site_settings (Admin → Website Settings →
 * Feature Banner). It renders NOTHING — no wrapper, no spacing — unless it
 * is enabled and has an image, and it removes itself again if the image
 * can't be loaded, so it never leaves an empty box on the page.
 */
export function FeatureBanner() {
  const s = useSiteSettings();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const src = s.feature_banner_image_url;
  if (!s.feature_banner_enabled || !src || failedSrc === src) return null;

  const title = s.feature_banner_title?.trim() || "";
  const description = s.feature_banner_description?.trim() || "";
  const hasText = Boolean(title || description);

  return (
    <section aria-label={title || "Featured"} className="container-adey pt-10 md:pt-14">
      <figure className="relative overflow-hidden rounded-3xl border border-border bg-muted shadow-[var(--shadow-card)]">
        {/* Reserved aspect box → no layout shift while the image downloads. */}
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
          <MediaImage
            src={src}
            alt={title || "Featured image"}
            className="absolute inset-0 h-full w-full object-cover"
            onFail={() => setFailedSrc(src)}
          />
          {hasText ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          ) : null}
          {hasText ? (
            <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
              {title ? (
                <h2 className="max-w-3xl font-heading text-2xl font-bold leading-tight text-white drop-shadow sm:text-3xl lg:text-4xl">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">{description}</p>
              ) : null}
            </figcaption>
          ) : null}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label="View full image"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Expand className="h-4 w-4" />
          </a>
        </div>
      </figure>
    </section>
  );
}
