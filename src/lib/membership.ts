/* eslint-disable @typescript-eslint/no-explicit-any -- new RPCs/columns are not in the generated Supabase types until it is regenerated */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MEMBERSHIP_COUNT_KEY = ["public", "membership-count"] as const;

export async function getMembershipCount(): Promise<number> {
  const { data, error } = await (supabase.rpc as any)("membership_count");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export function useMembershipCount() {
  return useQuery({
    queryKey: MEMBERSHIP_COUNT_KEY,
    queryFn: getMembershipCount,
    staleTime: 0,
    // Live count: re-read every 5 seconds while the tab is visible (paused in
    // background tabs), and immediately on returning to the tab or reconnecting.
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/** True once the Google Form's own script has reported a response — i.e. the
 * form is connected and every submission is confirmed (who + when) there. */
export function useGoogleConnected() {
  return useQuery({
    queryKey: ["public", "membership-google-connected"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("membership_google_connected");
      if (error) return false;
      return data === true;
    },
    staleTime: 60_000,
  });
}

/** Called automatically when the Membership page sees the embedded Google
 * Form's confirmation screen. Records the time of the registration and
 * returns the new total (or null if it could not be read back). */
export async function recordWebsiteRegistration(): Promise<number | null> {
  const { data, error } = await (supabase.rpc as any)("record_website_registration");
  if (!error) return data == null ? null : Number(data);

  // Database not updated yet (function missing): fall back to a plain insert
  // so registrations are still counted.
  const missing = error.code === "PGRST202" || /could not find the function/i.test(error.message);
  if (!missing) throw new Error(error.message);
  const ins = await (supabase.from as any)("membership_registrations").insert({});
  if (ins.error) throw new Error(ins.error.message);
  return null;
}

export type MembershipRegistration = {
  id: string;
  full_name: string | null;
  email: string | null;
  source: "website" | "google_form" | "legacy";
  submitted_at: string | null;
  created_at: string;
  answers: Record<string, unknown> | null;
};

/** Admin/editor only (row-level security). Newest first. */
export async function listMembershipRegistrations(): Promise<MembershipRegistration[]> {
  const full = await (supabase.from as any)("membership_registrations")
    .select("id, full_name, email, source, submitted_at, created_at, answers")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(5000);
  if (!full.error) return (full.data ?? []) as MembershipRegistration[];
  // Migration not applied yet: read the original columns.
  const basic = await (supabase.from as any)("membership_registrations")
    .select("id, full_name, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (basic.error) throw new Error(basic.error.message);
  return (basic.data ?? []).map((r: any) => ({
    ...r,
    source: "legacy",
    submitted_at: r.created_at,
    answers: null,
  }));
}

export async function deleteMembershipRegistration(id: string) {
  const { data, error } = await (supabase.from as any)("membership_registrations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error("Not allowed — only administrators can delete registrations.");
}

/** Total members = admin-set offset + real registrations counted since that
 * offset was set. This is how "admin corrects the count to 60, then it only
 * grows from there" works: the offset absorbs the gap between what the site
 * has tracked and the real-world number, and every new registration just adds
 * 1 on top — it never resets to a raw count. */
export function useTotalMembers(offset: number) {
  const { data: registered } = useMembershipCount();
  return offset + (registered ?? 0);
}
