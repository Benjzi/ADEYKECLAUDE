import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings } from "@/lib/site-settings";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/gallery", label: "Gallery" },
  { to: "/news", label: "News" },
  { to: "/events", label: "Events" },
  { to: "/socials", label: "Socials" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSiteSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-adey flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={settings.logo_url || logo}
            alt={settings.org_name}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-accent/60"
          />
          <div className="leading-tight">
            <div className="line-clamp-1 max-w-[160px] font-heading text-base font-bold text-ink sm:max-w-[260px]">{settings.org_name}</div>
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
                  active ? "bg-primary-soft text-primary" : "text-body hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link to="/donate" className="btn-accent ml-2">Donate Now</Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-primary lg:hidden"
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
          </nav>
        </div>
      ) : null}
    </header>
  );
}
