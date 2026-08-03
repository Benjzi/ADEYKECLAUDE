// Supabase Edge Function: admin-users
// Admin-only user management via service role, with role check.
// Requires the caller's JWT to belong to a user with role='admin'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userRes, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userRes.user.id;

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const { data: allRoles } = await admin.from("user_roles").select("user_id, role");
      const map = new Map<string, string[]>();
      for (const r of allRoles ?? []) {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role as string);
        map.set(r.user_id, arr);
      }
      return json(data.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        roles: map.get(u.id) ?? [],
        banned: !!(u as any).banned_until && new Date((u as any).banned_until) > new Date(),
      })));
    }

    if (action === "set_banned") {
      const userId = String(body?.userId ?? "");
      const banned = !!body?.banned;
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === callerId) return json({ error: "You cannot disable your own account." }, 400);
      if (banned) {
        const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
        if (admins && admins.length <= 1 && admins.some((a) => a.user_id === userId)) return json({ error: "Cannot disable the last admin." }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: banned ? "876000h" : "none",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "set_roles") {
      const userId = String(body?.userId ?? "");
      const targetRoles = (Array.isArray(body?.roles) ? body.roles : []).filter((r: string) => ["admin", "editor"].includes(r));
      if (!userId) return json({ error: "userId required" }, 400);
      if (!targetRoles.includes("admin")) {
        const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
        if (admins && admins.length <= 1 && admins.some((a) => a.user_id === userId)) return json({ error: "Cannot remove the last admin." }, 400);
      }
      const { error: delErr } = await admin.from("user_roles").delete().eq("user_id", userId);
      if (delErr) return json({ error: delErr.message }, 500);
      if (targetRoles.length > 0) {
        const { error: insErr } = await admin.from("user_roles").insert(targetRoles.map((role: string) => ({ user_id: userId, role })));
        if (insErr) return json({ error: insErr.message }, 500);
      }
      return json({ ok: true });
    }

    if (action === "invite") {
      const email = String(body?.email ?? "").trim();
      const password = String(body?.password ?? "");
      const fullName = String(body?.fullName ?? "").trim() || email.split("@")[0];
      const targetRoles = (Array.isArray(body?.roles) ? body.roles : []).filter((r: string) => ["admin", "editor"].includes(r));
      if (!email || !password || password.length < 10 || targetRoles.length === 0) return json({ error: "Invalid input" }, 400);
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: fullName },
      });
      if (error || !created.user) return json({ error: error?.message ?? "create failed" }, 500);
      const { error: insErr } = await admin.from("user_roles").insert(targetRoles.map((role: string) => ({ user_id: created.user!.id, role })));
      if (insErr) return json({ error: insErr.message }, 500);
      return json({ ok: true, userId: created.user.id });
    }

    if (action === "delete") {
      const userId = String(body?.userId ?? "");
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === callerId) return json({ error: "You cannot delete your own account." }, 400);
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length <= 1 && admins.some((a) => a.user_id === userId)) return json({ error: "Cannot delete the last admin." }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
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
