import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Heart } from "lucide-react";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings } from "@/lib/site-settings";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/programs", label: "Our Programs" },
  { to: "/gallery", label: "Gallery" },
  { to: "/news-events", label: "News & Events" },
  { to: "/membership", label: "Membership" },
  { to: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSiteSettings();

  // Passive scroll listener; React only re-renders when the boolean flips.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation, on Escape, and when the viewport
  // grows past the breakpoint where the desktop nav takes over.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1280px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  // One bar, fixed height (no jump). Over the hero it's a light frosted
  // surface of the page's OWN background colour (so it reads correctly in
  // both themes); after scrolling it firms up and gains a soft shadow.
  const firm = scrolled || open;

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none ${
        firm
          ? "border-border bg-background/95 shadow-[0_1px_12px_oklch(0_0_0/0.06)]"
          : "border-border/40 bg-background/80"
      }`}
    >
      <div className="container-adey flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-lg"
          aria-label={`${settings.org_name} — home`}
        >
          <img
            src={settings.logo_url || logo}
            alt=""
            width={40}
            height={40}
            decoding="async"
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-accent/60"
          />
          <span className="line-clamp-1 max-w-[11rem] font-heading text-[0.95rem] font-bold leading-tight text-ink sm:max-w-[16rem]">
            {settings.org_name}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`group relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none ${
                  active ? "text-primary" : "text-body hover:text-primary"
                }`}
              >
                {item.label}
                <span
                  aria-hidden
                  className={`absolute inset-x-3 -bottom-[3px] h-0.5 origin-left rounded-full bg-accent transition-transform duration-200 motion-reduce:transition-none ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link to="/donate" className="btn-accent btn-sm hidden sm:inline-flex">
            <Heart className="h-3.5 w-3.5" aria-hidden /> Donate
          </Link>
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="btn-icon xl:hidden"
          >
            {open ? (
              <X className="h-[1.1rem] w-[1.1rem]" />
            ) : (
              <Menu className="h-[1.1rem] w-[1.1rem]" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background xl:hidden"
        >
          <nav aria-label="Mobile" className="container-adey flex flex-col gap-1 py-3">
            {NAV.map((item) => {
              const active = isActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg border-l-2 px-3 py-3 text-[0.95rem] font-medium transition-colors ${
                    active
                      ? "border-accent bg-primary-soft text-primary"
                      : "border-transparent text-body hover:bg-muted hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link to="/donate" className="btn-accent mt-3">
              <Heart className="h-4 w-4" aria-hidden /> Donate
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
