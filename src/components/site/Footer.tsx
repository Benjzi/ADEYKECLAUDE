import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Youtube, Send, Facebook, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings, socialHref } from "@/lib/site-settings";

// TikTok has no lucide icon; use an inline glyph.
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.9a6.34 6.34 0 0 0 10.86-4.43V9.71a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.83 4.83 0 0 1-1.84-1.14z" />
    </svg>
  );
}

export function Footer() {
  const s = useSiteSettings();

  const socials = [
    { href: socialHref("youtube", s.social_youtube), label: "YouTube", Icon: Youtube },
    { href: socialHref("tiktok", s.social_tiktok), label: "TikTok", Icon: TikTokIcon },
    { href: socialHref("telegram_channel", s.social_telegram_channel) ?? socialHref("telegram_forum", s.social_telegram_forum), label: "Telegram", Icon: Send },
    { href: socialHref("facebook", s.social_facebook), label: "Facebook", Icon: Facebook },
    { href: socialHref("instagram", s.social_instagram), label: "Instagram", Icon: Instagram },
    { href: socialHref("linkedin", s.social_linkedin), label: "LinkedIn", Icon: Linkedin },
  ].filter((x) => x.href);

  return (
    <footer className="mt-24 bg-ink text-white/85">
      <div className="container-adey grid gap-10 py-16 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={s.footer_logo_url || s.logo_url || logo} alt={s.org_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-accent/60" />
            <div>
              <div className="font-heading font-bold text-white">{s.org_name}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            {s.footer_text}
          </p>
          {socials.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href!} target="_blank" rel="noreferrer" aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-accent hover:text-ink">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-accent">About Us</Link></li>
            <li><Link to="/news" className="hover:text-accent">News</Link></li>
            <li><Link to="/events" className="hover:text-accent">Events</Link></li>
            <li><Link to="/gallery" className="hover:text-accent">Gallery</Link></li>
            <li><Link to="/socials" className="hover:text-accent">Socials</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white">Get Involved</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/donate" className="hover:text-accent">Donate</Link></li>
            <li><Link to="/contact" className="hover:text-accent">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white">Reach Us</h4>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            {s.address ? <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {s.address}</li> : null}
            {s.phone_primary ? <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {s.phone_primary}</li> : null}
            {s.email ? <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {s.email}</li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-adey flex flex-col items-center justify-between gap-2 py-6 text-xs text-white/60 md:flex-row">
          <span>{s.copyright_text}</span>
          <span>Every child deserves to thrive.</span>
        </div>
      </div>
    </footer>
  );
}
