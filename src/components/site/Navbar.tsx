import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings } from "@/lib/site-settings";
import { useDarkMode } from "@/lib/dark-mode";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/programs", label: "Our Programs" },
  { to: "/gallery", label: "Gallery" },
  { to: "/news-events", label: "News & Events" },
  { to: "/membership", label: "Membership" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSiteSettings();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Frosted-glass effect that's safe everywhere, in both themes: it tints
  // and blurs with the page's OWN background/text colors (--background,
  // --ink), never a hardcoded white. That means at the top of any page —
  // over a photo, a colored hero, or plain white/dark content — the header
  // reads correctly, because the tint automatically matches whatever
  // "light" or "dark" means for the current theme. Once scrolled, it
  // settles into the normal solid bar.
  const solid = scrolled || open;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        solid ? "border-border bg-background/95 backdrop-blur-md shadow-sm" : "border-transparent bg-background/25 backdrop-blur-md"
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
            <div className="line-clamp-1 max-w-[160px] font-heading text-base font-bold text-ink sm:max-w-[260px]">
              {settings.org_name}
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  active ? "bg-primary-soft text-primary" : "text-body hover:bg-primary-soft/60 hover:text-primary"
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
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-body transition-colors duration-200 hover:bg-primary-soft/60 hover:text-primary"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-primary xl:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background xl:hidden">
          <nav className="container-adey flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm font-medium text-body transition-colors duration-200 hover:bg-primary-soft hover:text-primary"
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
              className="mt-2 flex items-center justify-center gap-2 rounded-md px-2 py-3 text-sm font-medium text-body transition-colors duration-200 hover:bg-muted"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? "Light mode" : "Dark mode"}
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
