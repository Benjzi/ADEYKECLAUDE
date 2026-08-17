import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Users, CheckCircle2, ExternalLink } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useSiteSettings } from "@/lib/site-settings";
import { useMembershipCount, submitMembershipRegistration } from "@/lib/membership";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — Adey CP" },
      { name: "description", content: "Become a member of Adey CP Humanitarian Association and join our community of supporters." },
    ],
  }),
  component: Membership,
});

function embedUrl(url: string) {
  if (url.includes("embedded=true")) return url;
  return url.includes("?") ? `${url}&embedded=true` : `${url}?embedded=true`;
}

function Membership() {
  const settings = useSiteSettings();
  const { data: count } = useMembershipCount();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function markSubmitted(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitMembershipRegistration({ full_name: name, email });
      setSubmitted(true);
      toast.success("Thank you for registering!");
    } catch (err: any) {
      toast.error(err.message ?? "Could not record your registration");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="Membership" title="Join our community.">
        Become a member of {settings.org_name} and stand with children with Cerebral Palsy and their families across Ethiopia.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey">
          {typeof count === "number" ? (
            <div className="mx-auto mb-10 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft/40 px-6 py-4 text-center">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <div className="font-heading text-2xl font-bold text-ink">{count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">people have registered as members</div>
              </div>
            </div>
          ) : null}

          {!settings.membership_form_url ? (
            <p className="mx-auto max-w-lg text-center text-sm text-muted-foreground">
              Our membership registration form is being set up — check back soon, or contact us directly to join.
            </p>
          ) : (
            <div className="mx-auto max-w-2xl">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
                <iframe
                  src={embedUrl(settings.membership_form_url)}
                  title="Membership registration form"
                  className="h-[760px] w-full"
                  loading="lazy"
                >
                  Loading…
                </iframe>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary-soft/20 p-6 text-center">
                {submitted ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-8 w-8" />
                    <p className="font-semibold">Thanks — your registration has been recorded!</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-body">Filled out the form above? Let us know so we can count you as a member.</p>
                    <form onSubmit={markSubmitted} className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
                      <input
                        type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="email" placeholder="Your email (optional)" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button type="submit" disabled={busy} className="btn-primary shrink-0 disabled:opacity-60">
                        {busy ? "Saving…" : "I've submitted the form"}
                      </button>
                    </form>
                  </>
                )}
              </div>

              <a
                href={settings.membership_form_url} target="_blank" rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Open the form in a new tab <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
