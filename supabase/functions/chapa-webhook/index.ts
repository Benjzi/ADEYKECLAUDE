// Supabase Edge Function: chapa-webhook
// Called by Chapa after a payment attempt. Re-verifies with Chapa (never trust payload).
// IMPORTANT: Chapa calls this both as a POST with a JSON body AND as a GET
// with query params (?trx_ref=...&status=...), including JSONP-style pings
// from the checkout page itself (?callback=jQuery..._...&_=...). We must
// handle all of these — the earlier POST-only/JSON-only version silently
// dropped GET callbacks and left donations stuck on "pending" forever.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const qp = url.searchParams;
  const jsonpCallback = qp.get("callback");

  function respond(body: string, status = 200) {
    if (jsonpCallback) {
      return new Response(`${jsonpCallback}(${JSON.stringify({ ok: status < 400, body })})`, {
        status: 200,
        headers: { "content-type": "application/javascript", ...corsHeaders },
      });
    }
    return new Response(body, { status, headers: corsHeaders });
  }

  try {
    let payload: any = {};
    if (req.method === "POST") {
      try { payload = await req.json(); } catch { payload = {}; }
    }

    const tx_ref: string | undefined =
      payload?.tx_ref ?? payload?.trx_ref ?? payload?.data?.tx_ref ??
      qp.get("tx_ref") ?? qp.get("trx_ref") ?? undefined;

    if (!tx_ref) return respond("missing tx_ref", 400);

    const secret = Deno.env.get("CHAPA_SECRET_KEY");
    if (!secret) return respond("server not configured", 500);

    // Always re-verify directly with Chapa — never trust the callback's own
    // "status" param, since it's just a hint from an unauthenticated ping.
    const verifyRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(tx_ref)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const verifyJson: any = await verifyRes.json().catch(() => ({}));
    const ok = verifyRes.ok && verifyJson?.status === "success" && verifyJson?.data?.status === "success";

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    await supabase.from("donations").update({
      status: ok ? "success" : "failed",
      chapa_reference: verifyJson?.data?.reference ?? qp.get("ref_id") ?? null,
      raw_payload: verifyJson ?? payload,
    }).eq("tx_ref", tx_ref);

    return respond("ok");
  } catch (e) {
    return respond((e as Error).message, 500);
  }
});
