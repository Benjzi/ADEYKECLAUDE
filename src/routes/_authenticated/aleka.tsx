import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/cms-admin";
import { LayoutDashboard, Newspaper, CalendarDays, LogOut, Home, Image as ImageIcon, Users2, Handshake, ShieldCheck, Inbox, Settings as SettingsIcon, HandCoins, Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/lib/dark-mode";
import logo from "@/assets/adey-logo.png";
import { useSiteSettings } from "@/lib/site-settings";

const rolesQuery = queryOptions({
  queryKey: ["me", "roles"],
  queryFn: () => getMyRoles(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/aleka")({
  loader: ({ context }) => context.queryClient.ensureQueryData(rolesQuery),
  component: AlekaLayout,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center text-destructive">
        <div className="text-lg font-bold">Something went wrong</div>
        <p className="mt-2 text-sm">{error.message}</p>
      </div>
    </div>
  ),
});

const NAV = [
  { to: "/aleka", label: "Dashboard", icon: LayoutDashboard, exact: true, adminOnly: false },
  { to: "/aleka/news", label: "News", icon: Newspaper, exact: false, adminOnly: false },
  { to: "/aleka/events", label: "Events", icon: CalendarDays, exact: false, adminOnly: false },
  { to: "/aleka/gallery", label: "Gallery", icon: ImageIcon, exact: false, adminOnly: false },
  { to: "/aleka/inbox", label: "Contact Inbox", icon: Inbox, exact: false, adminOnly: false },
  { to: "/aleka/staff", label: "Staff", icon: Users2, exact: false, adminOnly: false },
  { to: "/aleka/partners", label: "Partners", icon: Handshake, exact: false, adminOnly: false },
  { to: "/aleka/donors", label: "Donors", icon: HandCoins, exact: false, adminOnly: true },
  { to: "/aleka/settings", label: "Website Settings", icon: SettingsIcon, exact: false, adminOnly: true },
  { to: "/aleka/users", label: "Users & Roles", icon: ShieldCheck, exact: false, adminOnly: true },
] as const;

function AlekaLayout() {
  const settingsData = useSiteSettings();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { data: user } = useQuery({
    queryKey: ["me", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 60_000,
  });
  const { data: me } = useSuspenseQuery(rolesQuery);
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!me.isAdmin && !me.isEditor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Awaiting access</h1>
          <p className="mt-2 text-sm text-body">
            Your account (<strong>{user?.email}</strong>) is signed in but hasn't
            been granted an admin or editor role yet. Ask a site administrator
            to add you from <em>Users &amp; Roles</em>.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/" className="btn-primary"><Home className="h-4 w-4" /> Back to site</Link>
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-background">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nav = NAV.filter((n) => !n.adminOnly || me.isAdmin);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-muted/40 md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-sidebar text-sidebar-foreground md:min-h-screen">
        <div className="border-b border-sidebar-border p-5">
          <Link to="/" className="flex items-center gap-2">
            <img src={settingsData.logo_url || logo} alt={settingsData.org_name} className="h-8 w-8 rounded-full object-cover ring-1 ring-accent/60" />
            <span className="font-heading text-lg font-bold text-ink">{settingsData.org_name.split(" ")[0]} · Aleka</span>
          </Link>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Admin console</div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => {
            const active = item.exact ? location === item.to : location.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-primary text-primary-foreground" : "text-body hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-3 mt-2 space-y-2 pb-4">
          <button
            onClick={toggleDark}
            className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-body hover:bg-background"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? "Light mode" : "Dark mode"}
          </button>
          <Link to="/" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-body hover:bg-background">
            <Home className="h-4 w-4" /> View site
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-body hover:bg-destructive hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
          <h1 className="text-lg font-semibold">Admin</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {me.isAdmin ? "Admin" : "Editor"}
            </span>
            <span>{user?.email}</span>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
