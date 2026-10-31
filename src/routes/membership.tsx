import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Lock, CheckCircle2, ExternalLink, Award, Baby, Heart } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useSiteSettings } from "@/lib/site-settings";
import {
  MEMBERSHIP_COUNT_KEY,
  recordWebsiteRegistration,
  useGoogleConnected,
  useTotalMembers,
} from "@/lib/membership";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — Adey CP" },
      {
        name: "description",
        content:
          "Become a member of Adey CP Humanitarian Association and join our community of supporters.",
      },
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
  const qc = useQueryClient();
  const totalMembers = useTotalMembers(settings.membership_total_offset);
  const { data: googleConnected } = useGoogleConnected();
  const [submitted, setSubmitted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const formUrl = settings.membership_form_url ? embedUrl(settings.membership_form_url) : null;
  const pages = Math.max(1, settings.membership_form_pages || 1);

  // --- Automatic registration counting -------------------------------------
  // The form lives in a cross-origin iframe, so the page can't read it. But
  // when someone presses the form's own Submit, Google navigates the iframe to
  // its "response recorded" screen, which fires the iframe's `load` event
  // again. Loads: #1 = the form, #2..#pages = further pages of a multi-page
  // form, #pages+1 = the confirmation screen. Any load after that is a fresh
  // form ("Submit another response"), so counting starts over.
  const loads = useRef(0);
  const lastPing = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    loads.current = 0; // new form URL → start counting from scratch
    setSubmitted(false);
  }, [formUrl, pages]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const refreshCountSoon = useCallback(() => {
    qc.invalidateQueries({ queryKey: MEMBERSHIP_COUNT_KEY });
    // Google confirms a moment later; pick up its (exact) number too.
    [6000, 20000].forEach((ms) =>
      timers.current.push(
        window.setTimeout(() => qc.invalidateQueries({ queryKey: MEMBERSHIP_COUNT_KEY }), ms),
      ),
    );
  }, [qc]);

  const onSubmitted = useCallback(async () => {
    setSubmitted(true);
    toast.success("Thank you for registering!");
    const now = Date.now();
    const duplicate = now - lastPing.current < 20_000;
    lastPing.current = now;
    // Once the form's own script is connected it reports every response
    // itself (exactly, with name and time) — the page must not add a second one.
    if (!duplicate && !googleConnected) {
      try {
        const total = await recordWebsiteRegistration();
        if (total !== null) qc.setQueryData(MEMBERSHIP_COUNT_KEY, total);
      } catch (err) {
        console.error("Could not record registration", err);
      }
    }
    refreshCountSoon();
  }, [googleConnected, qc, refreshCountSoon]);

  const onFormLoad = useCallback(() => {
    loads.current += 1;
    if (loads.current === pages + 1) {
      void onSubmitted();
    } else if (loads.current > pages + 1) {
      loads.current = 1; // a brand-new form was opened
      setSubmitted(false);
    }
  }, [pages, onSubmitted]);

  const stats = [
    { icon: Users, label: "Total Members", value: totalMembers.toLocaleString() },
    settings.stat_honorable_members
      ? { icon: Award, label: "Honorable Members", value: settings.stat_honorable_members }
      : null,
    settings.stat_common_members
      ? { icon: Heart, label: "Common Members", value: settings.stat_common_members }
      : null,
    settings.stat_children_count
      ? { icon: Baby, label: "Children Supported", value: settings.stat_children_count }
      : null,
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];

  return (
    <SiteLayout>
      <PageHero eyebrow="Membership" title="Join our community.">
        Become a member of {settings.org_name} and stand with children with Cerebral Palsy and their
        families across Ethiopia.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey">
          <div className="mx-auto mb-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-5 text-center"
              >
                <s.icon className="mx-auto h-6 w-6 text-primary" />
                <div className="mt-2 font-heading text-2xl font-bold text-ink">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {!formUrl ? (
            <p className="mx-auto max-w-lg text-center text-sm text-muted-foreground">
              Our membership registration form is being set up — check back soon, or contact us
              directly to join.
            </p>
          ) : (
            <div className="mx-auto max-w-4xl">
              <div className="mx-auto mb-8 max-w-2xl text-center">
                <h2 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
                  Become a member
                </h2>
                <p className="mt-3 text-body">
                  Members are the heart of {settings.org_name}. Your registration and contribution
                  help us support children with Cerebral Palsy and their families. It takes about
                  two minutes: press the button below to open the registration form, fill it in and
                  press Submit.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
                <iframe
                  key={formUrl}
                  ref={(el) => {
                    // Locked: the form can't be clicked, tabbed into or read by
                    // screen readers until the visitor presses the button.
                    if (!el) return;
                    if (unlocked) el.removeAttribute("inert");
                    else el.setAttribute("inert", "");
                  }}
                  src={formUrl}
                  title="Membership registration form"
                  aria-hidden={!unlocked}
                  className={`block h-[920px] w-full transition-[filter] duration-500 sm:h-[1020px] lg:h-[1180px] ${
                    unlocked ? "" : "pointer-events-none select-none blur-md"
                  }`}
                  onLoad={onFormLoad}
                >
                  Loading…
                </iframe>

                {!unlocked ? (
                  <div className="absolute inset-0 flex items-start justify-center bg-background/50 px-4 pt-24 sm:pt-40">
                    <div className="max-w-md text-center">
                      <Lock className="mx-auto h-8 w-8 text-primary" aria-hidden />
                      <p className="mt-3 font-heading text-xl font-bold text-ink">
                        The registration form is ready
                      </p>
                      <button
                        type="button"
                        onClick={() => setUnlocked(true)}
                        className="btn-accent mt-5 w-full px-8 py-4 text-lg"
                      >
                        Click here to open the registration form
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {submitted ? (
                <div
                  role="status"
                  className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <p className="font-semibold">
                    Thank you — your registration has been recorded and counted!
                  </p>
                </div>
              ) : null}

              {googleConnected && settings.membership_form_url ? (
                <a
                  href={settings.membership_form_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  Form hard to use on your phone? Open it in a new tab{" "}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
