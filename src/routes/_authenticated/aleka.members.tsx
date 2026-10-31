import { createFileRoute } from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Download,
  Link2,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { getMyRoles } from "@/lib/cms-admin";
import {
  deleteMembershipRegistration,
  listMembershipRegistrations,
  MEMBERSHIP_COUNT_KEY,
  type MembershipRegistration,
} from "@/lib/membership";
import { buildFormScript } from "@/lib/membership-script";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const registrationsQuery = queryOptions({
  queryKey: ["admin", "registrations"],
  queryFn: () => listMembershipRegistrations(),
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/_authenticated/aleka/members")({
  loader: ({ context }) => context.queryClient.ensureQueryData(registrationsQuery),
  component: MembersAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
      {error.message}
    </div>
  ),
});

const SOURCE_LABEL: Record<MembershipRegistration["source"], { text: string; cls: string }> = {
  google_form: {
    text: "Confirmed by Google Form",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  website: {
    text: "Detected on website",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  legacy: { text: "Earlier record", cls: "bg-muted text-muted-foreground" },
};

const when = (r: MembershipRegistration) => new Date(r.submitted_at ?? r.created_at);
const fmt = (d: Date) =>
  d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function csvCell(v: unknown) {
  const s =
    v == null
      ? ""
      : Array.isArray(v)
        ? v.join("; ")
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: MembershipRegistration[]) {
  const answerKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.answers ?? {}))));
  const head = ["Date & time", "Name", "Email", "Source", ...answerKeys];
  const lines = rows.map((r) =>
    [
      when(r).toISOString(),
      r.full_name,
      r.email,
      SOURCE_LABEL[r.source]?.text ?? r.source,
      ...answerKeys.map((k) => r.answers?.[k]),
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob(["﻿" + [head.map(csvCell).join(","), ...lines].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function MembersAdmin() {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(registrationsQuery);
  const { data: me } = useQuery({
    queryKey: ["me", "roles"],
    queryFn: () => getMyRoles(),
    staleTime: 60_000,
  });
  const [filter, setFilter] = useState("");

  const del = useMutation({
    mutationFn: deleteMembershipRegistration,
    onSuccess: () => {
      toast.success("Registration deleted");
      qc.invalidateQueries({ queryKey: ["admin", "registrations"] });
      qc.invalidateQueries({ queryKey: MEMBERSHIP_COUNT_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const google = rows.filter((r) => r.source === "google_form");
  const detected = rows.filter((r) => r.source === "website");
  const lastGoogle = google[0] ? when(google[0]) : null;
  const connected = google.length > 0;

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.full_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q));
  }, [rows, filter]);

  const script = useMemo(
    () =>
      buildFormScript(
        import.meta.env.VITE_SUPABASE_URL ?? "",
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      ),
    [],
  );

  const tiles = [
    { icon: Users, label: "Registrations recorded", value: rows.length.toLocaleString() },
    { icon: UserCheck, label: "Confirmed with name", value: google.length.toLocaleString() },
    { icon: Clock, label: "Latest registration", value: rows[0] ? fmt(when(rows[0])) : "—" },
  ];

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h2 className="text-2xl font-bold">Membership registrations</h2>
        <p className="text-sm text-muted-foreground">
          Everyone who registered through the Membership page, with the exact time. Updates by
          itself.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card p-5">
            <t.icon className="h-5 w-5 text-primary" />
            <div className="mt-2 font-heading text-xl font-bold text-ink">{t.value}</div>
            <div className="text-xs text-muted-foreground">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-bold text-ink">Google Form connection</h3>
          {connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              {lastGoogle ? ` · last response ${fmt(lastGoogle)}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Not connected yet
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-body">
          {connected ? (
            <>
              Every response is sent to the website the moment it is submitted — with the person's
              name, email and answers, even if they used the form link directly.{" "}
              {detected.length > 0
                ? `${detected.length} recent registration(s) are still waiting for Google's confirmation.`
                : ""}
            </>
          ) : (
            <>
              Right now the website counts a registration when it sees the form's “response
              recorded” screen (time only — it cannot see <em>who</em>). Connect the form once to
              also get <strong>names, emails and answers</strong>, and exact counts even for people
              who use the form link directly.
            </>
          )}
        </p>

        <details
          className="mt-4 rounded-xl border border-border bg-background p-4"
          open={!connected}
        >
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            {connected
              ? "Show the setup steps and script again"
              : "Connect it — 2 minutes, one time"}
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-body">
            <li>Open your membership form in Google Forms (the editing view).</li>
            <li>
              Click the <strong>⋮</strong> menu (top right) → <strong>Script editor</strong>.
            </li>
            <li>
              Delete what's in the editor, paste the script below, and click <strong>Save</strong>.
            </li>
            <li>
              Click the <strong>Triggers</strong> clock icon (left) → <strong>Add Trigger</strong> →
              function <code>onFormSubmit</code>, event source <em>From form</em>, event type{" "}
              <em>On form submit</em> → Save, and allow the permissions Google asks for.
            </li>
            <li>
              Submit one test response on the form — it appears in the list below within seconds.
            </li>
          </ol>
          <div className="relative mt-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute right-2 top-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(script);
                  toast.success("Script copied");
                } catch {
                  toast.error("Couldn't copy — select the text and copy it manually");
                }
              }}
            >
              <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" /> Copy script
            </Button>
            <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 pr-32 text-xs leading-relaxed text-foreground">
              {script}
            </pre>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The script only <em>sends</em> responses to your website. It contains your site's public
            key (the same one every visitor's browser already uses), nothing secret.
          </p>
        </details>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search name or email…"
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => downloadCsv(shown)}
          >
            <Download className="mr-1.5 h-4 w-4" /> Download CSV
          </Button>
        </div>
        {shown.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No registrations recorded yet." : "Nothing matches your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date &amp; time</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">How it was recorded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const src = SOURCE_LABEL[r.source] ?? SOURCE_LABEL.legacy;
                  const answers = Object.entries(r.answers ?? {});
                  return (
                    <tr key={r.id} className="border-b border-border/60 align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-3">{fmt(when(r))}</td>
                      <td className="px-4 py-3">
                        {r.full_name || <span className="text-muted-foreground">—</span>}
                        {answers.length > 0 ? (
                          <details className="mt-1 text-xs text-muted-foreground">
                            <summary className="cursor-pointer text-primary">Form answers</summary>
                            <dl className="mt-1 space-y-0.5">
                              {answers.map(([k, v]) => (
                                <div key={k}>
                                  <dt className="inline font-medium text-foreground">{k}: </dt>
                                  <dd className="inline">
                                    {Array.isArray(v) ? v.join(", ") : String(v)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {r.email || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${src.cls}`}
                        >
                          {src.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {me?.isAdmin ? (
                          <button
                            type="button"
                            aria-label="Delete registration"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete this registration? The member count goes down by one.",
                                )
                              )
                                del.mutate(r.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
