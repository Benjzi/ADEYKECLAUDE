import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Link2, Facebook, Twitter, Check, Images } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getPublishedNews, listNewsGalleryAlbums, listPublishedNews } from "@/lib/cms-public";
import { AlbumCard, AlbumViewer, type Album } from "@/components/site/GalleryAlbum";
import { useQuery } from "@tanstack/react-query";
import { MediaImage } from "@/components/site/MediaImage";

const newsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["news", "public", slug],
    queryFn: () => getPublishedNews({ data: { slug } }),
  });

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(newsQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — Adey CP News` : "Article — Adey CP";
    const desc = loaderData?.excerpt ?? "Adey CP news article.";
    const image = loaderData?.cover_image_url ?? undefined;
    const meta = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta };
  },
  component: NewsDetail,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-adey py-24 text-center">
        <h1>Article not found</h1>
        <p className="mt-2 text-body">This story may have been unpublished or moved.</p>
        <Link to="/news-events" className="btn-primary mt-6 inline-block">
          Back to News
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="container-adey py-24 text-center">
          <h1>Something went wrong</h1>
          <p className="mt-2 text-body">{error.message}</p>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </SiteLayout>
    );
  },
});

function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1" aria-hidden>
      <div
        className="h-full bg-accent transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function NewsDetail() {
  const { slug } = Route.useParams();
  const { data: article } = useSuspenseQuery(newsQuery(slug));
  const [copied, setCopied] = useState(false);
  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null);

  const { data: albumData } = useQuery({
    queryKey: ["public", "news-albums", article?.id],
    queryFn: () => listNewsGalleryAlbums(article!.id),
    enabled: !!article?.id,
  });
  const { data: allNews } = useQuery({
    queryKey: ["news", "public", "list"],
    queryFn: () => listPublishedNews(),
  });
  const related = useMemo(() => {
    const others = (allNews ?? []).filter((n) => n.id !== article?.id);
    const same = others.filter((n) => article?.category && n.category === article.category);
    return [...same, ...others.filter((n) => !same.includes(n))].slice(0, 3);
  }, [allNews, article]);

  const albums = useMemo<Album[]>(() => {
    if (!albumData) return [];
    const byCat = new Map<string, Album>();
    for (const c of albumData.categories)
      byCat.set(c.id, {
        id: c.id,
        name: c.name,
        description: c.description,
        cover_image_url: c.cover_image_url,
        items: [],
      });
    for (const it of albumData.items)
      if (it.category_id && byCat.has(it.category_id)) byCat.get(it.category_id)!.items.push(it);
    return Array.from(byCat.values()).filter((a) => a.items.length > 0);
  }, [albumData]);
  const openAlbum = albums.find((a) => a.id === openAlbumId) ?? null;

  if (!article) return null;

  const readMins = Math.max(1, Math.round((article.body || "").split(/\s+/).length / 200));
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareBtn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-body transition hover:border-primary hover:text-primary";

  return (
    <SiteLayout>
      <ReadingProgress />
      <article>
        {/* hero */}
        <header className="relative isolate overflow-hidden bg-brand text-white">
          {article.cover_image_url ? (
            <MediaImage
              priority
              sizes="100vw"
              src={article.cover_image_url}
              alt=""
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-deep via-brand/60 to-brand/30" />
          <div className="container-adey py-12 md:py-20">
            <Link
              to="/news-events"
              hash="news"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 no-underline hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> All news
            </Link>
            <div className="mt-6 max-w-3xl">
              {article.category ? (
                <div className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                  {article.category}
                </div>
              ) : null}
              <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
                {article.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
                {article.published_at ? (
                  <span>
                    {new Date(article.published_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
                <span aria-hidden>·</span>
                <span>{readMins} min read</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container-adey py-10 md:py-14">
          <div className="grid gap-10 md:grid-cols-[auto_1fr]">
            <div className="flex gap-2 md:sticky md:top-24 md:h-fit md:flex-col">
              <span className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:block">
                Share
              </span>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Facebook"
                className={shareBtn}
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on X"
                className={shareBtn}
              >
                <Twitter className="h-4 w-4" />
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                aria-label="Copy link"
                className={shareBtn}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="max-w-3xl">
              {article.excerpt ? (
                <p className="mb-8 border-l-4 border-accent pl-5 text-xl leading-relaxed text-ink">
                  {article.excerpt}
                </p>
              ) : null}
              <div className="prose prose-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body || ""}</ReactMarkdown>
              </div>
              {article.tags?.length ? (
                <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
                  {article.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}

              {albums.length > 0 ? (
                <div className="mt-10 border-t border-border pt-6">
                  <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
                    <Images className="h-5 w-5 text-primary" /> Photos from this story
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {albums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={album}
                        onOpen={() => setOpenAlbumId(album.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="bg-muted/40 py-12 md:py-16">
            <div className="container-adey">
              <h2 className="font-heading text-2xl font-bold text-ink md:text-3xl">More stories</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {related.map((n) => (
                  <Link
                    key={n.id}
                    to="/news/$slug"
                    params={{ slug: n.slug }}
                    className="group overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lifted)]"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      {n.cover_image_url ? (
                        <MediaImage
                          sizes="(min-width: 768px) 33vw, 100vw"
                          src={n.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : null}
                    </div>
                    <div className="p-5">
                      {n.published_at ? (
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {new Date(n.published_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      ) : null}
                      <h3 className="mt-1.5 font-heading text-lg font-bold text-ink group-hover:text-primary">
                        {n.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>

      {openAlbum ? <AlbumViewer album={openAlbum} onClose={() => setOpenAlbumId(null)} /> : null}
    </SiteLayout>
  );
}
