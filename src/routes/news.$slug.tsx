import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { ArrowLeft, Link2, Facebook, Twitter, Check } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getPublishedNews } from "@/lib/cms-public";

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
        <Link to="/news" className="btn-primary mt-6 inline-block">Back to News</Link>
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
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary mt-6">Try again</button>
        </div>
      </SiteLayout>
    );
  },
});

function NewsDetail() {
  const { slug } = Route.useParams();
  const { data: article } = useSuspenseQuery(newsQuery(slug));
  const [copied, setCopied] = useState(false);
  if (!article) return null;

  const readMins = Math.max(1, Math.round((article.body || "").split(/\s+/).length / 200));
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <SiteLayout>
      <article className="container-adey py-12 md:py-16">
        <Link to="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> All News
        </Link>
        <header className="mt-6 max-w-3xl">
          {article.category ? (
            <div className="mb-3 inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              {article.category}
            </div>
          ) : null}
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">{article.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {article.published_at ? (
              <span>
                {new Date(article.published_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            ) : null}
            <span aria-hidden>·</span>
            <span>{readMins} min read</span>
          </div>
        </header>
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-3xl object-cover shadow-[var(--shadow-lifted)]"
          />
        ) : null}

        <div className="mt-8 grid gap-10 md:grid-cols-[auto_1fr]">
          <div className="flex gap-2 md:sticky md:top-24 md:h-fit md:flex-col">
            <span className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:block">Share</span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noreferrer" aria-label="Share on Facebook"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition hover:border-primary hover:text-primary"
            ><Facebook className="h-4 w-4" /></a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
              target="_blank" rel="noreferrer" aria-label="Share on X"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition hover:border-primary hover:text-primary"
            ><Twitter className="h-4 w-4" /></a>
            <button
              onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
              aria-label="Copy link"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition hover:border-primary hover:text-primary"
            >{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}</button>
          </div>

          <div className="max-w-3xl">
            <div className="prose prose-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body || ""}</ReactMarkdown>
            </div>
            {article.tags?.length ? (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
                {article.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
