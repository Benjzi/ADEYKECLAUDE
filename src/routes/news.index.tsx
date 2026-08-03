import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
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

function News() {
  const { data: items } = useSuspenseQuery(newsListQuery);
  const [featured, ...rest] = items;
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
            <div className="space-y-14">
              {featured ? <FeaturedNews item={featured} /> : null}
              {rest.length > 0 && (
                <div>
                  <div className="mb-6 flex items-end justify-between">
                    <h2 className="font-heading text-2xl font-bold text-ink">More stories</h2>
                    <div className="h-px flex-1 mx-4 bg-border" />
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{rest.length} article{rest.length === 1 ? "" : "s"}</div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {rest.map((item) => <NewsCard key={item.id} item={item} />)}
                  </div>
                </div>
              )}
            </div>
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
      className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lifted)] md:grid-cols-2"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-muted md:aspect-auto">
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
      </div>
      <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
        <div className="inline-flex items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">Featured</span>
          {item.category ? <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span> : null}
        </div>
        <h2 className="font-heading text-3xl font-bold text-ink group-hover:text-primary md:text-4xl">{item.title}</h2>
        {item.excerpt ? <p className="line-clamp-3 text-body">{item.excerpt}</p> : null}
        {item.published_at ? (
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {new Date(item.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </div>
        ) : null}
      </div>
    </Link>
  );
}


function NewsCard({ item }: { item: NewsListItem }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: item.slug }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-lg"
    >
      {item.cover_image_url ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
          <img
            src={item.cover_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/10 to-accent/20" />
      )}
      <div className="p-5">
        {item.category ? (
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-foreground/80">
            {item.category}
          </div>
        ) : null}
        <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary">
          {item.title}
        </h3>
        {item.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm text-body">{item.excerpt}</p>
        ) : null}
        {item.published_at ? (
          <div className="mt-3 text-xs text-muted-foreground">
            {new Date(item.published_at).toLocaleDateString(undefined, {
              year: "numeric", month: "long", day: "numeric",
            })}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
