import baseLogo from "@/assets/adey-logo-160.png";
import { MediaImage } from "./MediaImage";

/**
 * The organisation logo. It can never be blank or a placeholder:
 *  - the bundled Adey CP logo is the base layer — it ships with the site, so it
 *    paints instantly with no network request and can't fail;
 *  - a logo uploaded in Website Settings (`url`) is layered on top and replaces
 *    the base only once it has fully loaded. If it fails to load, the base
 *    simply stays.
 * Size and ring come from `className` (e.g. "h-10 w-10 ring-2 ring-accent/60").
 */
export function BrandLogo({
  url,
  alt,
  className = "",
  priority = false,
}: {
  url?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`brand-logo relative inline-block shrink-0 overflow-hidden rounded-full ${className}`}
    >
      <img
        src={baseLogo}
        alt={alt}
        decoding="async"
        className="brand-logo-base absolute inset-0 h-full w-full object-cover"
      />
      {url ? (
        <MediaImage
          src={url}
          alt=""
          aria-hidden
          priority={priority}
          sizes="64px"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
