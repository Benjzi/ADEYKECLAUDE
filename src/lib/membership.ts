import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function getMembershipCount(): Promise<number> {
  const { data, error } = await (supabase.rpc as any)("membership_count");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export function useMembershipCount() {
  return useQuery({
    queryKey: ["public", "membership-count"],
    queryFn: getMembershipCount,
    staleTime: 30_000,
  });
}

export async function submitMembershipRegistration(input: { full_name?: string; email?: string }) {
  const { error } = await (supabase.from as any)("membership_registrations").insert({
    full_name: input.full_name || null,
    email: input.email || null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Total members = admin-set offset + real Google Form registrations counted
 * since that offset was set. This is how "admin corrects the count to 60,
 * then it only grows from there" works: the offset absorbs the gap between
 * what the site has tracked and the real-world number, and every new
 * registration just adds 1 on top — it never resets to a raw count. */
export function useTotalMembers(offset: number) {
  const { data: registered } = useMembershipCount();
  return offset + (registered ?? 0);
}
