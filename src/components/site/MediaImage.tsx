import { useCallback, useEffect, useState, type ImgHTMLAttributes } from "react";
import { originalFromRenderUrl } from "@/lib/media-url";

type Props = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "loading" | "decoding" | "onError"
> & {
  src: string;
  /** Above-the-fold / LCP image: loads eagerly with high fetch priority.
   * Everything else is lazy with low priority. Use sparingly. */
  priority?: boolean;
  /** Called once if the image can't be loaded at all (after the
   * original-file retry). Lets a parent hide an empty container. */
  onFail?: () => void;
};

/**
 * Drop-in <img> for site content.
 *
 * Network-level fixes (resized sources, stable URLs) live in
 * src/lib/media-url.ts. This component handles the browser side:
 *  - the <img> stays invisible until the browser has the *whole* image, so a
 *    half-downloaded image is never painted in horizontal bands;
 *  - priority images load eagerly/high, the rest lazily, with async decoding;
 *  - if the resized variant 4xx's (e.g. image transforms unavailable), it
 *    retries once with the original file before giving up;
 *  - the parent owns the placeholder (a bg-muted box) and the reserved
 *    aspect ratio, so there is no layout shift.
 */
export function MediaImage({
  src,
  alt = "",
  priority = false,
  onFail,
  className = "",
  ...rest
}: Props) {
  const [current, setCurrent] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [triedOriginal, setTriedOriginal] = useState(false);

  useEffect(() => {
    setCurrent(src);
    setLoaded(false);
    setTriedOriginal(false);
  }, [src]);

  // Already in the HTTP/memory cache: `load` may have fired before React
  // attached the handler, so check `complete` on mount.
  const ref = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  function handleError() {
    if (!triedOriginal) {
      const original = originalFromRenderUrl(current);
      setTriedOriginal(true);
      if (original) {
        setCurrent(original);
        return;
      }
    }
    onFail?.();
  }

  return (
    <img
      ref={ref}
      src={current}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      data-loaded={loaded ? "true" : "false"}
      onLoad={() => setLoaded(true)}
      onError={handleError}
      className={`media-img ${className}`}
      {...rest}
    />
  );
}
