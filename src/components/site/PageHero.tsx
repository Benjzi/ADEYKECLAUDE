import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,var(--color-accent),transparent_45%)]" />
      <div className="container-adey relative py-20 md:py-24">
        {eyebrow ? (
          <div className="mb-3 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="max-w-3xl text-4xl font-bold text-white md:text-5xl">{title}</h1>
        {children ? (
          <div className="mt-4 max-w-2xl text-lg text-white/85">{children}</div>
        ) : null}
      </div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
      {icon ? <div className="mx-auto mb-3 text-primary">{icon}</div> : null}
      <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ComingSoonNotice({ phase }: { phase: string }) {
  return (
    <div className="container-adey py-16">
      <EmptyState
        title="Content loads from the CMS"
        description={`This section will populate automatically once ${phase} is deployed. Public visitors will always see published content — never a fake spinner.`}
      />
    </div>
  );
}
