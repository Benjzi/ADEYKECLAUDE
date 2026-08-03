import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, HandCoins, Receipt, TrendingUp } from "lucide-react";
import { listAllDonations, type DonationRow } from "@/lib/cms-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const donationsQuery = queryOptions({ queryKey: ["admin", "donations"], queryFn: () => listAllDonations() });

export const Route = createFileRoute("/_authenticated/aleka/donors")({
  loader: ({ context }) => context.queryClient.ensureQueryData(donationsQuery),
  component: DonorsAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function fmtBirr(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}

const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

type Donor = {
  email: string;
  name: string;
  totalGiven: number;
  giftCount: number;
  lastGiftAt: string;
  donations: DonationRow[];
};

function DonorsAdmin() {
  const { data: donations } = useSuspenseQuery(donationsQuery);

  const successful = donations.filter((d) => d.status === "success");
  const totalRaised = successful.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const avgGift = successful.length > 0 ? totalRaised / successful.length : 0;

  const donors = useMemo<Donor[]>(() => {
    const byEmail = new Map<string, Donor>();
    for (const d of donations) {
      const email = d.donor_email || "unknown";
      const existing = byEmail.get(email);
      const amount = d.status === "success" ? Number(d.amount || 0) : 0;
      if (existing) {
        existing.totalGiven += amount;
        existing.giftCount += 1;
        existing.donations.push(d);
        if (new Date(d.created_at) > new Date(existing.lastGiftAt)) existing.lastGiftAt = d.created_at;
        if (!existing.name && d.donor_name) existing.name = d.donor_name;
      } else {
        byEmail.set(email, {
          email,
          name: d.donor_name || "",
          totalGiven: amount,
          giftCount: 1,
          lastGiftAt: d.created_at,
          donations: [d],
        });
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => b.totalGiven - a.totalGiven);
  }, [donations]);

  const uniqueDonorCount = new Set(successful.map((d) => d.donor_email)).size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Donors</h2>
        <p className="text-sm text-muted-foreground">Every donation recorded through the Chapa checkout, and who gave it.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={HandCoins} label="Total raised" value={fmtBirr(totalRaised)} tint="text-emerald-700 bg-emerald-100" />
        <StatCard icon={Users} label="Registered donors" value={String(uniqueDonorCount)} tint="text-primary bg-primary-soft" />
        <StatCard icon={Receipt} label="Successful gifts" value={String(successful.length)} tint="text-accent-dark bg-accent/15" />
        <StatCard icon={TrendingUp} label="Average gift" value={fmtBirr(avgGift)} tint="text-primary bg-primary-soft" />
      </div>

      <Tabs defaultValue="donors">
        <TabsList>
          <TabsTrigger value="donors">Donors ({donors.length})</TabsTrigger>
          <TabsTrigger value="all">All donations ({donations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="donors" className="mt-4">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Total given</th>
                  <th className="px-4 py-3">Gifts</th>
                  <th className="px-4 py-3">Last gift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donors.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No donations yet.</td></tr>
                ) : donors.map((d) => (
                  <tr key={d.email}>
                    <td className="px-4 py-3 font-medium">{d.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.email}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{fmtBirr(d.totalGiven)}</td>
                    <td className="px-4 py-3">{d.giftCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(d.lastGiftAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donations.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No donations yet.</td></tr>
                ) : donations.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{d.donor_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{d.donor_email}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmtBirr(Number(d.amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[d.status] ?? ""}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.tx_ref}</td>
                    <td className="max-w-xs px-4 py-3 text-muted-foreground">{d.message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-heading text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
