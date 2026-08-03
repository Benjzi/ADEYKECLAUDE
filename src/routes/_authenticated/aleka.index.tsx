import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStats } from "@/lib/cms-admin";
import { Newspaper, CalendarDays, FilePen, Clock, Image as ImageIcon, Users2, Handshake, Inbox } from "lucide-react";

const statsQuery = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: () => getAdminStats(),
});

export const Route = createFileRoute("/_authenticated/aleka/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: Dashboard,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
      {error.message}
    </div>
  ),
});

function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ["me", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 60_000,
  });
  const { data: s } = useSuspenseQuery(statsQuery);
  const cards = [
    { l: "Published news", v: s.newsPublished, icon: Newspaper, to: "/aleka/news" as const },
    { l: "Draft news", v: s.newsDrafts, icon: FilePen, to: "/aleka/news" as const },
    { l: "Upcoming events", v: s.eventsUpcoming, icon: CalendarDays, to: "/aleka/events" as const },
    { l: "Past events", v: s.eventsPast, icon: Clock, to: "/aleka/events" as const },
    { l: "Gallery items", v: s.gallery, icon: ImageIcon, to: "/aleka/gallery" as const },
    { l: "Staff", v: s.staff, icon: Users2, to: "/aleka/staff" as const },
    { l: "Partners", v: s.partners, icon: Handshake, to: "/aleka/partners" as const },
    { l: "Unread messages", v: s.messagesUnread, icon: Inbox, to: "/aleka/inbox" as const },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="text-2xl font-bold">Welcome back, {user?.email?.split("@")[0] ?? "friend"}.</h2>
        <p className="mt-2 max-w-2xl text-body">
          You're inside the Aleka console — the private admin panel for Adey CP.
          Manage News, Events, Gallery, Staff, Partners, and Contact messages from here.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.l} to={c.to} className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.l}</div>
              <c.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="mt-2 font-heading text-3xl font-bold text-primary">{c.v}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
