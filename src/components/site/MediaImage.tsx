import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { isRenderUrl, reportRenderFailure, signOriginal } from "@/lib/media-url";

type Props = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "loading" | "decoding" | "onError"
> & {
  src: string;
  /** Above-the-fold / LCP image: loads eagerly with high fetch priority.
   * Everything else is lazy with low priority. Use sparingly. */
  priority?: boolean;
  /** Called once if the image can't be loaded at all (after retries and the
   * original-file fallback). Lets a parent hide an empty container. */
  onFail?: () => void;
};

const withRetryParam = (url: string, n: number) => `${url}${url.includes("?") ? "&" : "?"}_r=${n}`;

/**
 * Drop-in <img> for site content.
 *
 * Network-level fixes (resized sources, stable URLs) live in
 * src/lib/media-url.ts. This component handles the browser side:
 *  - the <img> stays invisible until the browser has the *whole* image, so a
 *    half-downloaded image is never painted in horizontal bands;
 *  - priority images load eagerly/high, the rest lazily, with async decoding;
 *  - failures are handled in order: retry the resized URL once (transient
 *    errors), then fall back to a freshly signed original, retrying that with
 *    backoff, and only then give up;
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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const failures = useRef(0);
  const usingOriginal = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const lastSrc = useRef(src);

  // New source from the parent → start over. (Skipped on first render so we
  // don't clobber an image that is already loaded/cached.)
  useEffect(() => {
    if (lastSrc.current === src) return;
    lastSrc.current = src;
    window.clearTimeout(timer.current);
    failures.current = 0;
    usingOriginal.current = false;
    setCurrent(src);
    setLoaded(false);
  }, [src]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Cached image: `load` can fire before React attaches the handler.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [current]);

  function handleError() {
    failures.current += 1;
    const n = failures.current;
    if (!usingOriginal.current && isRenderUrl(current)) {
      if (n === 1) {
        // Probably a hiccup: retry the same resized URL shortly.
        timer.current = window.setTimeout(() => setCurrent(withRetryParam(src, n)), 700);
        return;
      }
      reportRenderFailure(src);
      usingOriginal.current = true;
      failures.current = 0;
      void signOriginal(src).then((url) => {
        if (url) setCurrent(url);
        else onFail?.();
      });
      return;
    }
    if (n <= 2) {
      timer.current = window.setTimeout(
        () => setCurrent(withRetryParam(current.replace(/[?&]_r=\d+/, ""), n)),
        800 * n,
      );
      return;
    }
    onFail?.();
  }

  return (
    <img
      ref={imgRef}
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
