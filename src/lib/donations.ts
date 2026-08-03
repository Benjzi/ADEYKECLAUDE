import { supabase } from "@/integrations/supabase/client";

export type ChapaInitInput = {
  amount: number;
  donor_name?: string;
  donor_email: string;
  message?: string;
  return_url: string;
};

/**
 * Initialize a Chapa donation via a Supabase Edge Function.
 * The edge function inserts the pending donation and calls Chapa's API
 * (keeping CHAPA_SECRET_KEY server-side, out of the browser).
 */
export async function initializeChapaDonation({ data }: { data: ChapaInitInput }) {
  const { data: res, error } = await supabase.functions.invoke<{ checkout_url: string; tx_ref: string }>(
    "chapa-init",
    { body: data },
  );
  if (error) throw new Error(error.message ?? "Could not start payment");
  if (!res?.checkout_url) throw new Error("Payment provider did not return a checkout URL");
  return res;
}
