import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@/lib/server-fn-shim";
import { HandHeart, Loader2, ShieldCheck, Smartphone, CreditCard, Landmark, Heart } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { initializeChapaDonation } from "@/lib/donations";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate — Adey CP" },
      { name: "description", content: "Support Adey CP's programs for children with Cerebral Palsy in Ethiopia. Secure Chapa checkout." },
      { property: "og:title", content: "Donate to Adey CP" },
      { property: "og:description", content: "Every gift funds therapy, education, and family support." },
    ],
  }),
  component: Donate,
});

const PRESETS = [250, 500, 1000, 2500, 5000] as const;
const POPULAR = 1000;

function impactFor(amount: number) {
  const sessions = Math.max(1, Math.round(amount / 250));
  if (amount < 500) return `≈ ${sessions} therapy session${sessions === 1 ? "" : "s"} for a child`;
  if (amount < 2000) return `≈ ${sessions} therapy sessions, or a month of learning materials for one child`;
  return `≈ ${sessions} therapy sessions — enough to support a child's care for weeks`;
}

function Donate() {
  const initFn = useServerFn(initializeChapaDonation);
  const settings = useSiteSettings();
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const impact = useMemo(() => impactFor(amount || 0), [amount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount < 10) { toast.error("Please enter an amount of at least ETB 10"); return; }
    if (!email) { toast.error("Please enter your email"); return; }
    setBusy(true);
    try {
      const res = await initFn({
        data: {
          amount,
          donor_name: name,
          donor_email: email,
          message,
          return_url: `${window.location.origin}/donate/success`,
        },
      });
      window.location.href = res.checkout_url;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start payment");
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="Donate" title="Fund a child's next milestone.">
        Secure checkout via Chapa. Cards, mobile money, and bank transfers supported.
      </PageHero>

      <section className="section-pad">
        <div className="container-adey grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          {/* Trust / impact sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            {settings.donation_info ? (
              <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-5 text-sm text-body">
                {settings.donation_info}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="bg-gradient-to-br from-primary to-primary-dark p-6 text-white">
                <Heart className="h-6 w-6 text-accent" />
                <div className="mt-3 font-heading text-xl font-bold">Where your gift goes</div>
                <p className="mt-1 text-sm text-white/80">Every donation goes directly toward programs — not overhead.</p>
              </div>
              <div className="space-y-4 p-6 text-sm text-body">
                <div className="flex items-center justify-between rounded-xl bg-primary-soft/50 px-4 py-3">
                  <span className="font-semibold text-ink">Your gift, in action</span>
                </div>
                <p className="rounded-xl border border-dashed border-primary/30 bg-primary-soft/20 px-4 py-3 font-medium text-primary">
                  {impact}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Secure &amp; trusted
              </div>
              <ul className="mt-3 space-y-2 text-sm text-body">
                <li>256-bit encrypted checkout via Chapa</li>
                <li>We never see or store your card details</li>
                <li>Instant receipt sent to your email</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body"><Smartphone className="h-3.5 w-3.5" /> Mobile Money</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body"><CreditCard className="h-3.5 w-3.5" /> Card</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body"><Landmark className="h-3.5 w-3.5" /> Bank Transfer</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-lifted)] md:p-10">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 1 · Amount</div>
              <h2 className="mt-2 text-2xl">How much would you like to give?</h2>
              <p className="mt-1 text-sm text-body">Amounts in Ethiopian Birr (ETB).</p>

              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setAmount(v); setCustom(""); }}
                    className={`relative rounded-xl border-2 px-3 py-4 font-heading font-bold transition-all ${
                      amount === v && !custom
                        ? "border-primary bg-primary text-white shadow-lg scale-[1.03]"
                        : "border-border bg-background text-ink hover:border-primary hover:-translate-y-0.5"
                    }`}
                  >
                    {v === POPULAR ? (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground shadow">
                        Popular
                      </span>
                    ) : null}
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-sm font-semibold text-ink" htmlFor="custom">Or enter another amount</label>
                <input
                  id="custom"
                  type="number"
                  min={10}
                  max={1000000}
                  inputMode="numeric"
                  placeholder="Custom amount"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n > 0) setAmount(n);
                  }}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 2 · Your details</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="name">Your name (optional)</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="email">Email <span className="text-destructive">*</span></label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold text-ink" htmlFor="msg">Note to the team (optional)</label>
                <textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft to-primary-soft/40 p-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Your gift</div>
              <div className="font-heading text-5xl font-bold text-ink">ETB {amount.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted-foreground">{impact}</div>
            </div>

            <button type="submit" disabled={busy} className="btn-accent w-full text-base disabled:opacity-70">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <HandHeart className="h-5 w-5" />}
              {busy ? "Redirecting to Chapa…" : "Continue to Chapa Payment"}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> You'll be securely redirected to Chapa to complete your payment. We never store your card details.
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
