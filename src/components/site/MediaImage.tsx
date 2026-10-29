import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { classifyUrl, recoverUrl, responsiveSrcSet } from "@/lib/media-url";

type Props = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "loading" | "decoding" | "onError"
> & {
  src: string;
  /** Above-the-fold / LCP image: loads eagerly with high fetch priority.
   * Everything else is lazy with low priority. Use sparingly. */
  priority?: boolean;
  /** Called once if the image can't be loaded at all (after retries and
   * every fallback). Lets a parent hide an empty container. */
  onFail?: () => void;
};

const withRetryParam = (url: string, n: number) =>
  `${url.replace(/[?&]_r=\d+/, "")}${url.includes("?") ? "&" : "?"}_r=${n}`;

/**
 * Drop-in <img> for site content.
 *
 * URL-level work (public CDN URLs, resizing, stable URLs) lives in
 * src/lib/media-url.ts. This component handles the browser side:
 *  - the <img> stays invisible until the browser has the *whole* image, so a
 *    half-downloaded image is never painted in horizontal bands;
 *  - responsive `srcset`, so phones download a small file;
 *  - priority images load eagerly/high, the rest lazily, with async decoding;
 *  - failures recover in order: public URL → signed (resized) → signed
 *    original, with retries on transient errors, and only then give up;
 *  - the parent owns the placeholder and the reserved aspect ratio, so there
 *    is no layout shift.
 */
export function MediaImage({
  src,
  alt = "",
  priority = false,
  onFail,
  className = "",
  sizes = "100vw",
  ...rest
}: Props) {
  const [current, setCurrent] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const retried = useRef({ render: false, plain: 0 });
  const timer = useRef<number | undefined>(undefined);
  const lastSrc = useRef(src);

  // New source from the parent → start over. (Skipped on first render so we
  // don't clobber an image that is already loaded/cached.)
  useEffect(() => {
    if (lastSrc.current === src) return;
    lastSrc.current = src;
    window.clearTimeout(timer.current);
    retried.current = { render: false, plain: 0 };
    setCurrent(src);
    setLoaded(false);
  }, [src]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Cached image: `load` can fire before React attaches the handler.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [current]);

  function giveUpOrRetryPlain() {
    if (retried.current.plain < 2) {
      const n = ++retried.current.plain;
      timer.current = window.setTimeout(() => setCurrent((c) => withRetryParam(c, n)), 800 * n);
    } else {
      onFail?.();
    }
  }

  function fallBack(failed: string) {
    void recoverUrl(failed).then((url) => (url ? setCurrent(url) : giveUpOrRetryPlain()));
  }

  function handleError() {
    const kind = classifyUrl(current);
    if (kind === "public") {
      // Almost always "bucket isn't public" — go straight to a signed URL.
      fallBack(current);
    } else if (kind === "signed-render") {
      if (!retried.current.render) {
        // Probably a hiccup: retry the same resized URL once.
        retried.current.render = true;
        timer.current = window.setTimeout(() => setCurrent((c) => withRetryParam(c, 1)), 700);
      } else {
        fallBack(current);
      }
    } else {
      giveUpOrRetryPlain();
    }
  }

  // Only the original public URL gets responsive candidates; after any
  // fallback we use the single URL we fell back to.
  const srcSet = current === src ? responsiveSrcSet(current) : undefined;

  return (
    <img
      ref={imgRef}
      src={current}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
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
