import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then((res: { data: { user: unknown | null }; error: unknown | null }) => {
      if (!mounted) return;
      setState(!res.error && res.data.user ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e: string, session: { user?: unknown } | null) => {
      if (!mounted) return;
      setState(session?.user ? "in" : "out");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (state === "loading") {
    return (
      <SiteLayout>
        <div className="section-pad container-adey text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }
  if (state === "out") return <InlineSignIn />;
  return <Outlet />;
}

function InlineSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="Restricted" title="Staff sign-in">
        Adey CP staff only. Accounts are invite-only.
      </PageHero>
      <section className="section-pad">
        <div className="container-adey">
          <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="password">Password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-center text-xs text-muted-foreground">Need access? Contact the site administrator.</p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
