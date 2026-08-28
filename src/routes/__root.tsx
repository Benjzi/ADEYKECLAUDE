import { Outlet, createRootRouteWithContext, useMatches, useRouter, useNavigate, Link } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSiteSettings, applyThemeMode } from "@/lib/site-settings";

/** Applies the admin-selected theme (brand navy/gold, or a custom color) globally. */
function ThemeSync() {
  const settings = useSiteSettings();
  useEffect(() => {
    applyThemeMode(settings.theme_mode, settings.theme_color);
    return () => applyThemeMode("brand", null);
  }, [settings.theme_mode, settings.theme_color]);
  return null;
}

/** Swaps the browser tab icon to the admin-uploaded favicon, if one is set. */
function FaviconSync() {
  const settings = useSiteSettings();
  useEffect(() => {
    if (!settings.favicon_url) return;
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]');
    const originals: { el: HTMLLinkElement; href: string }[] = [];
    links.forEach((el) => {
      originals.push({ el, href: el.href });
      el.href = settings.favicon_url!;
    });
    return () => originals.forEach(({ el, href }) => { el.href = href; });
  }, [settings.favicon_url]);
  return null;
}

type HeadDescriptor = {
  meta?: Array<Record<string, string>>;
  links?: Array<Record<string, string>>;
};

/**
 * Client-side head manager: walks matched routes' `head()` outputs,
 * merges them, and writes to document title + meta tags. Lets existing
 * route `head()` blocks keep working in an SPA (without SSR).
 */
function RouteHead() {
  const router = useRouter();
  const matches = useMatches();
  useEffect(() => {
    let title: string | null = null;
    const metaMap = new Map<string, Record<string, string>>();
    for (const m of matches) {
      const route = (router as any).routesById?.[m.routeId];
      const headFn = route?.options?.head;
      let descriptor: HeadDescriptor | undefined;
      if (typeof headFn === "function") {
        try {
          descriptor = headFn({ loaderData: (m as any).loaderData, params: (m as any).params, match: m });
        } catch {
          descriptor = undefined;
        }
      } else if (headFn) {
        descriptor = headFn as HeadDescriptor;
      }
      if (!descriptor?.meta) continue;
      for (const tag of descriptor.meta) {
        if (tag.title) { title = tag.title; continue; }
        const key = tag.name ? `name:${tag.name}` : tag.property ? `property:${tag.property}` : JSON.stringify(tag);
        metaMap.set(key, tag);
      }
    }
    if (title) document.title = title;
    for (const [key, tag] of metaMap) {
      const [kind, val] = key.split(":");
      if (kind !== "name" && kind !== "property") continue;
      let el = document.head.querySelector(`meta[${kind}="${val}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(kind, val);
        document.head.appendChild(el);
      }
      if (tag.content) el.setAttribute("content", tag.content);
    }
  }, [matches, router]);
  return null;
}

/**
 * Smart-routing fallback: search engines (and old cached/guessed links)
 * often point at slug-like paths that were never real routes here —
 * e.g. "/what-we-do" or "/who-we-are" from on-page headings, "/give"
 * or "/support" as natural alternate wordings for donating, etc.
 * Rather than a dead 404, recognize the intent and land on the real page.
 */
const SMART_REDIRECTS: { to: string; keywords: string[] }[] = [
  { to: "/about", keywords: [
    "what-we-do", "whatwedo", "who-we-are", "whoweare", "about-us", "aboutus",
    "our-mission", "mission", "our-vision", "vision", "our-story", "story",
    "our-values", "values", "our-goals", "goals", "objectives", "our-team",
    "team", "founder", "leadership", "who-are-we",
  ] },
  { to: "/donate", keywords: [
    "give", "giving", "support-us", "support", "contribute", "contribution",
    "sponsor", "sponsorship", "fundraise", "fundraising", "donation", "donations",
  ] },
  { to: "/news-events", keywords: ["news", "events", "event", "blog", "press", "updates", "stories"] },
  { to: "/gallery", keywords: ["photos", "photo", "media", "album", "albums", "pictures"] },
  { to: "/contact", keywords: ["contact-us", "reach-us", "get-in-touch", "location", "find-us"] },
  { to: "/membership", keywords: ["join", "join-us", "member", "members", "register", "signup", "sign-up"] },
  { to: "/socials", keywords: ["social", "social-media", "follow", "follow-us"] },
];

function findSmartRedirect(pathname: string): string | null {
  const slug = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!slug) return null;
  for (const group of SMART_REDIRECTS) {
    if (group.keywords.some((k) => slug === k || slug.includes(k))) return group.to;
  }
  return null;
}

function NotFoundComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = router.state.location.pathname;
  const target = findSmartRedirect(pathname);

  useEffect(() => {
    if (target) navigate({ to: target, replace: true });
  }, [target, navigate]);

  if (target) return null; // redirecting, nothing to flash on screen

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-primary">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error?.message ?? "Something went wrong."}</p>
        <div className="mt-6"><a href="/" className="btn-primary">Go home</a></div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <>
      <RouteHead />
      <FaviconSync />
      <ThemeSync />
      <Outlet />
    </>
  );
}
