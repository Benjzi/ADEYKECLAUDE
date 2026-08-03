import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  if (!article) return null;
  return (
    <SiteLayout>
      <article className="container-adey py-12 md:py-16">
        <Link to="/news" className="text-sm font-semibold text-primary hover:underline">← All News</Link>
        <header className="mt-4 max-w-3xl">
          {article.category ? (
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-accent-foreground/80">
              {article.category}
            </div>
          ) : null}
          <h1 className="text-3xl font-bold md:text-4xl">{article.title}</h1>
          {article.published_at ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {new Date(article.published_at).toLocaleDateString(undefined, {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          ) : null}
        </header>
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-[var(--shadow-card)]"
          />
        ) : null}
        <div className="prose prose-lg mt-8 max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body || ""}</ReactMarkdown>
        </div>
        {article.tags?.length ? (
          <div className="mt-8 flex max-w-3xl flex-wrap gap-2">
            {article.tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    </SiteLayout>
  );
}
