import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Newspaper, ArrowUpRight, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, EmptyState } from "@/components/site/PageHero";
import { listPublishedNews, type NewsListItem } from "@/lib/cms-public";

const newsListQuery = queryOptions({
  queryKey: ["news", "public", "list"],
  queryFn: () => listPublishedNews(),
});

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "News — Adey CP" },
      { name: "description", content: "Latest stories, updates, and announcements from Adey CP Humanitarian Association." },
      { property: "og:title", content: "News — Adey CP" },
      { property: "og:description", content: "Stories and updates from Adey CP." },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(newsListQuery),
  component: News,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="container-adey py-24 text-center">
          <h1>News couldn't load</h1>
          <p className="mt-2 text-body">{error.message}</p>
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary mt-6">Try again</button>
        </div>
      </SiteLayout>
    );
  },
});

function isRecent(dateStr: string | null) {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 1000 * 60 * 60 * 24 * 10;
}

function News() {
  const { data: items } = useSuspenseQuery(newsListQuery);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[],
    [items],
  );
  const filtered = activeCat ? items.filter((i) => i.category === activeCat) : items;
  const [featured, ...rest] = filtered;

  return (
    <SiteLayout>
      <PageHero eyebrow="News" title="Stories from the field.">
        Latest updates, milestones, and voices from the Adey CP community.
      </PageHero>
      <section className="section-pad">
        <div className="container-adey">
          {items.length === 0 ? (
            <EmptyState
              icon={<Newspaper className="h-10 w-10" />}
              title="No articles published yet"
              description="Check back soon — our team publishes new stories regularly."
            />
          ) : (
            <>
              {categories.length > 0 ? (
                <div className="mb-10 flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCat(null)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                      activeCat === null ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-primary-soft hover:text-primary"
                    }`}
                  >
                    All stories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCat(c)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                        activeCat === c ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-primary-soft hover:text-primary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="space-y-14">
                {featured ? <FeaturedNews item={featured} /> : null}
                {rest.length > 0 && (
                  <div>
                    <div className="mb-6 flex items-end justify-between">
                      <h2 className="font-heading text-2xl font-bold text-ink">More stories</h2>
                      <div className="mx-4 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{rest.length} article{rest.length === 1 ? "" : "s"}</div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {rest.map((item) => <NewsCard key={item.id} item={item} />)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function FeaturedNews({ item }: { item: NewsListItem }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: item.slug }}
      className="group relative grid overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition duration-500 hover:shadow-[var(--shadow-lifted)] md:grid-cols-2"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted md:aspect-auto">
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r" />
      </div>
      <div className="relative flex flex-col justify-center gap-4 p-8 md:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
          {item.category ? <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span> : null}
          {isRecent(item.published_at) ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> New
            </span>
          ) : null}
        </div>
        <h2 className="font-heading text-3xl font-bold text-ink transition-colors group-hover:text-primary md:text-4xl">{item.title}</h2>
        {item.excerpt ? <p className="line-clamp-3 text-body">{item.excerpt}</p> : null}
        <div className="flex items-center justify-between">
          {item.published_at ? (
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {new Date(item.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </div>
          ) : <span />}
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read story <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewsCard({ item }: { item: NewsListItem }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: item.slug }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lifted)]"
    >
      {item.cover_image_url ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
          <img
            src={item.cover_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/10 to-accent/20" />
      )}
      {isRecent(item.published_at) ? (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          New
        </span>
      ) : null}
      <div className="p-5">
        {item.category ? (
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-foreground/80">
            {item.category}
          </div>
        ) : null}
        <h3 className="font-heading text-lg font-bold text-ink transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        {item.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm text-body">{item.excerpt}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-between">
          {item.published_at ? (
            <div className="text-xs text-muted-foreground">
              {new Date(item.published_at).toLocaleDateString(undefined, {
                year: "numeric", month: "short", day: "numeric",
              })}
            </div>
          ) : <span />}
          <ArrowUpRight className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}
