// One-time script to create the first admin user on a fresh Supabase project.
//
// Why a script and not raw SQL: auth.users passwords are hashed by GoTrue,
// and hand-inserting rows into auth.users/auth.identities is fragile and
// can silently produce an account that can't log in. The supported way to
// create a user is the Admin API, which this script calls with your
// SERVICE ROLE key (never expose that key in the browser or commit it).
//
// Usage:
//   1. In your Supabase dashboard: Project Settings -> API Keys -> copy the
//      "service_role" secret key (NOT the publishable/anon key).
//   2. Run from the project root:
//        SUPABASE_URL="https://hjcglwesrybxbztaukoc.supabase.co" \
//        SUPABASE_SERVICE_ROLE_KEY="<paste service role key>" \
//        ADMIN_EMAIL="benjaminzelalem@gmail.com" \
//        ADMIN_PASSWORD="123456789" \
//        node supabase/seed-admin.mjs
//   3. Delete your shell history / unset the vars afterwards if you're on a
//      shared machine. Change the password after your first login.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`Creating admin user ${ADMIN_EMAIL} ...`);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // skip email verification, account is usable immediately
    user_metadata: { full_name: ADMIN_EMAIL.split("@")[0] },
  });

  if (createErr) {
    console.error("Failed to create user:", createErr.message);
    process.exit(1);
  }

  const userId = created.user.id;
  console.log(`User created: ${userId}`);

  // The handle_new_user() trigger already inserted a profiles row.
  // Now grant the admin role.
  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });

  if (roleErr) {
    console.error("User created, but failed to assign admin role:", roleErr.message);
    process.exit(1);
  }

  console.log("Admin role granted. Done.");
  console.log(`Log in at /auth with email: ${ADMIN_EMAIL}`);
}

main();
