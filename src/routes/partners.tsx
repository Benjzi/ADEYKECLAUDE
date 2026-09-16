import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Handshake, ExternalLink, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, EmptyState } from "@/components/site/PageHero";
import { listPublicPartners } from "@/lib/cms-public";
import { useSiteSettings } from "@/lib/site-settings";

const partnersQuery = queryOptions({ queryKey: ["public", "partners"], queryFn: () => listPublicPartners() });

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Our Partners — Adey CP" },
      { name: "description", content: "Government bureaus, health institutions, and organizations partnering with Adey CP to support children with Cerebral Palsy in Ethiopia." },
      { property: "og:title", content: "Our Partners — Adey CP" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partnersQuery),
  component: Partners,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="section-pad container-adey text-center text-destructive">{error.message}</div>
    </SiteLayout>
  ),
});

function Partners() {
  const { data: partners } = useSuspenseQuery(partnersQuery);
  const s = useSiteSettings();

  return (
    <SiteLayout>
      <PageHero eyebrow="Our Partners" title="Working together for every child.">
        We collaborate with government agencies, health institutions, international organizations,
        and local communities to expand what's possible for children with Cerebral Palsy.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey">
          {partners.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-10 w-10" />}
              title="Partners coming soon"
              description="Our partner organizations will be listed here."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => {
                const inner = (
                  <>
                    <div className="flex h-24 items-center justify-center">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={p.name} className="max-h-20 max-w-[75%] object-contain" loading="lazy" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft font-heading text-xl font-bold text-primary">
                          {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                      )}
                    </div>
                    <h2 className="mt-5 text-center font-heading text-lg font-bold text-ink">{p.name}</h2>
                    {p.website_url ? (
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-primary">
                        Visit website <ExternalLink className="h-3 w-3" />
                      </div>
                    ) : null}
                  </>
                );
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
                  >
                    {p.website_url ? (
                      <a href={p.website_url} target="_blank" rel="noreferrer" className="block">{inner}</a>
                    ) : inner}
                  </div>
                );
              })}
            </div>
          )}

          {/* Become a partner */}
          <div className="mt-16 rounded-3xl border border-border bg-muted/40 p-8 text-center md:p-12">
            <Handshake className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 text-2xl md:text-3xl">Partner with us</h2>
            <p className="mx-auto mt-3 max-w-xl text-body">
              Whether you're a government bureau, health institution, company, or community
              organization — together we can reach more children and families.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/contact" className="btn-primary">
                Get in touch <ArrowRight className="h-4 w-4" />
              </Link>
              {s.email ? (
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 rounded-full border-2 border-border px-6 py-3 font-heading font-bold text-body transition hover:border-primary hover:text-primary">
                  {s.email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
