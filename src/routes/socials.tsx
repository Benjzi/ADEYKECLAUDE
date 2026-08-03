import { createFileRoute } from "@tanstack/react-router";
import { Youtube, Send, ExternalLink, Users } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useSiteSettings, socialHref } from "@/lib/site-settings";

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.9a6.34 6.34 0 0 0 10.86-4.43V9.71a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.83 4.83 0 0 1-1.84-1.14z" />
    </svg>
  );
}

export const Route = createFileRoute("/socials")({
  head: () => ({
    meta: [
      { title: "Socials & Community — Adey CP" },
      { name: "description", content: "Follow Adey CP on YouTube, TikTok, and our Telegram forum — join the community and stay close to the story." },
      { property: "og:title", content: "Adey CP — Socials & Community" },
      { property: "og:description", content: "Follow our story on YouTube, TikTok, and Telegram." },
    ],
  }),
  component: Socials,
});

function displayHandle(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  // it's a full URL — show the last path segment as the handle
  const seg = trimmed.replace(/\/+$/, "").split("/").pop() ?? "";
  return seg.startsWith("@") ? seg : `@${seg}`;
}

function Socials() {
  const s = useSiteSettings();

  const CHANNELS = [
    {
      key: "youtube",
      name: "YouTube",
      handle: displayHandle(s.social_youtube),
      href: socialHref("youtube", s.social_youtube),
      desc: "Full-length stories from the field, family interviews, and behind-the-scenes of our programs.",
      tint: "from-red-600 to-red-500",
      Icon: Youtube,
    },
    {
      key: "tiktok",
      name: "TikTok",
      handle: displayHandle(s.social_tiktok),
      href: socialHref("tiktok", s.social_tiktok),
      desc: "Short daily moments — therapy wins, milestones, and the personalities that make Adey CP feel like home.",
      tint: "from-neutral-900 to-neutral-700",
      Icon: TikTokIcon,
    },
    {
      key: "telegram",
      name: "Telegram Forum",
      handle: displayHandle(s.social_telegram_forum),
      href: socialHref("telegram_forum", s.social_telegram_forum),
      desc: "Our community forum for families, volunteers, therapists, and supporters — announcements, Q&A, and mutual aid.",
      tint: "from-sky-600 to-sky-400",
      Icon: Send,
    },
  ].filter((c) => c.href);

  const telegramHref = socialHref("telegram_forum", s.social_telegram_forum);

  return (
    <SiteLayout>
      <PageHero eyebrow="Socials" title="Stay close to the story.">
        Follow along, join the conversation, and help our children's voices reach further.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey">
          {CHANNELS.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {CHANNELS.map((c) => (
                <a
                  key={c.key}
                  href={c.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lifted)]"
                >
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tint} text-white shadow-lg`}>
                    <c.Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-heading text-2xl font-bold text-ink">{c.name}</h3>
                  <div className="mt-1 text-sm font-semibold text-primary">{c.handle}</div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-body">{c.desc}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:underline">
                    Open <ExternalLink className="h-4 w-4" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Social links haven't been set up yet — add them in the admin dashboard under Website Settings.
            </p>
          )}

          {telegramHref ? (
            <div className="mt-14 rounded-3xl border border-border bg-primary-soft/40 p-8 md:p-12">
              <div className="grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-heading text-xl text-ink">A community, not just a channel.</h3>
                  <p className="mt-1 text-sm text-body">
                    Our Telegram forum is where families, volunteers, and therapists talk every day. Join us — introduce yourself, ask a question, share a story.
                  </p>
                </div>
                <a href={telegramHref} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Join Telegram <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </SiteLayout>
  );
}
