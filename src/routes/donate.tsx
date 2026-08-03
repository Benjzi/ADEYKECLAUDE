import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@/lib/server-fn-shim";
import { HandHeart, Loader2 } from "lucide-react";
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

function Donate() {
  const initFn = useServerFn(initializeChapaDonation);
  const settings = useSiteSettings();
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
        <div className="container-adey">
          {settings.donation_info ? (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-primary/20 bg-primary-soft/40 p-4 text-sm text-body">
              {settings.donation_info}
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
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
                    className={`rounded-xl border-2 px-3 py-4 font-heading font-bold transition-colors ${
                      amount === v && !custom
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-ink hover:border-primary"
                    }`}
                  >
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
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 2 · Your details</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="name">Your name (optional)</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="email">Email <span className="text-destructive">*</span></label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold text-ink" htmlFor="msg">Note to the team (optional)</label>
                <textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
              </div>
            </div>

            <div className="rounded-2xl bg-primary-soft/60 p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Your gift</div>
              <div className="font-heading text-4xl font-bold text-ink">ETB {amount.toLocaleString()}</div>
            </div>

            <button type="submit" disabled={busy} className="btn-accent w-full disabled:opacity-70">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <HandHeart className="h-5 w-5" />}
              {busy ? "Redirecting to Chapa…" : "Continue to Chapa Payment"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              You'll be securely redirected to Chapa to complete your payment. We never store your card details.
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
