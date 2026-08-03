import { Outlet, createRootRouteWithContext, useMatches, useRouter, Link } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSiteSettings, applyThemeColor } from "@/lib/site-settings";

/** Applies the admin-selected brand color globally, site-wide. */
function ThemeSync() {
  const settings = useSiteSettings();
  useEffect(() => {
    applyThemeColor(settings.theme_color);
    return () => applyThemeColor(null);
  }, [settings.theme_color]);
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

function NotFoundComponent() {
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
