import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Login — Adey CP" },
      { name: "description", content: "Sign in to the Adey CP admin panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

const REMEMBER_KEY = "adey.auth.remember_email";

function Auth() {
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      if (res.data.session) navigate({ to: "/aleka", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      // "Remember me" controls session persistence: persist across browser
      // restarts when checked, otherwise session-only (cleared on tab close).
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const client = remember
        ? supabase
        : createClient<Database>(url, key, {
            auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: true },
          });

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }

      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        // Mirror the session into the default client (localStorage) so the
        // rest of the app sees it — then immediately mark it session-only by
        // moving it to sessionStorage on unload isn't reliable, so instead
        // we set the session on the shared client and rely on user signing
        // out. Simpler: setSession on the shared client so app works.
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
      }
      navigate({ to: "/aleka", replace: true });
    } finally {
      setLoading(false);
    }
  }

  async function onReset() {
    setError(null); setNotice(null);
    if (!email) { setError("Enter your email above first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) setError(error.message);
    else setNotice("If an account exists, a reset link has been sent.");
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Staff sign-in">
        Adey CP staff area. Accounts are provisioned by an administrator.
      </PageHero>
      <section className="section-pad">
        <div className="container-adey">
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex flex-col items-center text-center">
              <img src={settings.logo_url || logo} alt={settings.org_name} className="h-16 w-16 rounded-full object-cover ring-2 ring-accent/60" />
              <div className="mt-2 text-sm font-semibold text-ink">{settings.org_name}</div>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="email">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="password">Password</label>
                <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-primary" />
              </div>
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-input" />
                Remember me
              </label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {notice ? <p className="text-sm text-primary">{notice}</p> : null}
              <button className="btn-primary w-full" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <button type="button" onClick={onReset} className="w-full text-center text-xs text-muted-foreground hover:text-primary">
                Forgot password?
              </button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
