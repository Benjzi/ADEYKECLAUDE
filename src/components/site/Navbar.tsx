import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings } from "@/lib/site-settings";
import { useDarkMode } from "@/lib/dark-mode";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/gallery", label: "Gallery" },
  { to: "/news-events", label: "News & Events" },
  { to: "/membership", label: "Membership" },
  { to: "/socials", label: "Socials" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // At the very top, the header sits over a dark hero (photo slideshow on
  // the homepage, the colored PageHero gradient everywhere else), so it can
  // safely go fully transparent with light text/logo. Once scrolled, it
  // solidifies for readability over normal page content.
  const solid = scrolled || open;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        solid ? "border-b border-border bg-background/85 backdrop-blur" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container-adey flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={settings.logo_url || logo}
            alt={settings.org_name}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-accent/60"
          />
          <div className="leading-tight">
            <div className={`line-clamp-1 max-w-[160px] font-heading text-base font-bold transition-colors sm:max-w-[260px] ${solid ? "text-ink" : "text-white drop-shadow"}`}>
              {settings.org_name}
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  solid
                    ? active ? "bg-primary-soft text-primary" : "text-body hover:text-primary"
                    : active ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link to="/donate" className="btn-accent ml-2">Donate Now</Link>
          <button
            type="button"
            onClick={toggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={`ml-1 flex h-9 w-9 items-center justify-center rounded-full transition ${
              solid ? "text-body hover:bg-muted" : "text-white/90 hover:bg-white/10"
            }`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`rounded-md p-2 lg:hidden ${solid ? "text-primary" : "text-white"}`}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="container-adey flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm font-medium text-body hover:bg-primary-soft hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/donate" onClick={() => setOpen(false)} className="btn-accent mt-2">
              Donate Now
            </Link>
            <button
              type="button"
              onClick={toggleDark}
              className="mt-2 flex items-center justify-center gap-2 rounded-md px-2 py-3 text-sm font-medium text-body hover:bg-muted"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? "Light mode" : "Dark mode"}
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
