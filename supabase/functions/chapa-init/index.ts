// Supabase Edge Function: chapa-init
// Initializes a Chapa payment session and records a pending donation.
// Env: CHAPA_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    const donor_email: string = String(body?.donor_email ?? "").trim();
    const donor_name: string = String(body?.donor_name ?? "").trim();
    const message: string = String(body?.message ?? "").trim();
    const return_url: string = String(body?.return_url ?? "").trim();

    if (!Number.isFinite(amount) || amount < 10) return json({ error: "Invalid amount" }, 400);
    if (!donor_email || !/^\S+@\S+\.\S+$/.test(donor_email)) return json({ error: "Invalid email" }, 400);
    if (!return_url || !/^https?:\/\//.test(return_url)) return json({ error: "Invalid return_url" }, 400);

    const secret = Deno.env.get("CHAPA_SECRET_KEY");
    if (!secret) return json({ error: "Chapa is not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const tx_ref = `adeycp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const [first_name, ...rest] = (donor_name || "Kind").split(" ");
    const last_name = rest.join(" ") || "Donor";

    const { error: insErr } = await supabase.from("donations").insert({
      tx_ref, amount, currency: "ETB",
      donor_name: donor_name || null,
      donor_email,
      message: message || null,
      status: "pending",
    });
    if (insErr) return json({ error: insErr.message }, 500);

    const origin = new URL(return_url).origin;
    const chapaBody = {
      amount: String(amount), currency: "ETB", email: donor_email, first_name, last_name, tx_ref,
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/chapa-webhook`,
      return_url,
      customization: { title: "Adey CP Donation", description: "Support children with Cerebral Palsy in Ethiopia" },
      meta: { source: origin },
    };

    const res = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(chapaBody),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || j?.status !== "success" || !j?.data?.checkout_url) {
      await supabase.from("donations").update({ status: "failed", raw_payload: j }).eq("tx_ref", tx_ref);
      return json({ error: j?.message ?? "Chapa initialization failed" }, 502);
    }
    return json({ checkout_url: j.data.checkout_url, tx_ref });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}
