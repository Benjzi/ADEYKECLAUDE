# Adey CP — Website (standalone, self-hosted Supabase + Netlify)

This project has been migrated off Lovable Cloud onto your own Supabase
project. It is a plain Vite + React + TanStack Router SPA — no Lovable
build dependency, no server runtime required.

- **Frontend:** Netlify (static SPA)
- **Backend:** Your Supabase project (`hjcglwesrybxbztaukoc`)

---

## 1. What changed in this migration

- `.env` — now points at your Supabase project (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`). The old `.env` mixed a Lovable Cloud
  proxy URL with an unrelated second Supabase project's keys; both are gone.
- `supabase/config.toml` — `project_id` updated to `hjcglwesrybxbztaukoc`.
- `supabase/migrations/` — the original project's 10 fragmented migration
  files (several of them empty no-ops) were consolidated into one clean file:
  `20260713000000_initial_schema.sql`. It defines the **entire** schema:
  enums, `profiles`, `user_roles`, `has_role()`, the `handle_new_user()`
  signup trigger, `news`, `events`, `gallery_categories`, `gallery_items`,
  `staff`, `partners`, `donations`, `contact_messages`, every RLS policy,
  and the `media` storage bucket + its policies (the bucket itself was
  never in the original migrations — it had been created by hand on the
  old project, so it's now defined in code).
- `supabase/seed-admin.mjs` — new. One-time script to create your first
  admin account (see step 3 below); the old project had none checked in.
- Removed: `.lovable/`, the Lovable notice block in `AGENTS.md`, Lovable's
  private package-registry lockfile (`bun.lock`) and `bunfig.toml`'s
  Lovable-specific excludes. None of these affected the build — the app
  never had a Lovable build plugin — they were metadata only.
- Everything else (components, routes, styling, business logic) is
  untouched. `src/integrations/supabase/types.ts` (the generated DB types)
  already matched the schema exactly, so it needed no changes.

---

## 2. Database schema — ✅ already applied live

This has been done for you directly against `hjcglwesrybxbztaukoc` via the
Supabase connector (not just generated as SQL). Verified:

- All 10 tables exist (`profiles`, `user_roles`, `news`, `events`,
  `gallery_categories`, `gallery_items`, `staff`, `partners`, `donations`,
  `contact_messages`), each with RLS enabled.
- `has_role()`, `handle_new_user()`, and the `on_auth_user_created` trigger
  on `auth.users` all exist.
- The `media` storage bucket exists: private, 8 MB limit, image MIME types
  only, with public-read / editor-write storage policies.
- PostgREST's schema cache was force-reloaded (`NOTIFY pgrst, 'reload
  schema'`) — the `Could not find the table 'public.news'...` error is
  resolved.
- Tested end-to-end as the `anon` role: `SELECT` on `news`/`events`/
  `gallery_categories`/`gallery_items` all succeed; `INSERT` on
  `contact_messages` (the exact call `submitContactMessage()` makes)
  succeeds and was cleaned up afterwards.
- Security advisor: clean except one expected `WARN` (`contact_messages`
  allows anonymous `INSERT` — by design, it's the public contact form,
  and length/format are still enforced by `check` constraints).
- Performance advisor: only routine "at scale" notices (RLS calling
  `auth.<fn>()` per-row instead of `(select auth.<fn>())`, a couple of
  unindexed FKs, unused indexes on empty tables) — safe to ignore for a
  site this size, or ask me to optimize them later.
- The three edge functions (`admin-users`, `chapa-init`, `chapa-webhook`)
  are deployed and `ACTIVE`, with `verify_jwt` set correctly for each (see
  §4 below — this matters more than usual because of the new-format
  publishable key).

`supabase/migrations/20260713000000_initial_schema.sql` in this repo is
kept in sync with what's live, so `supabase db push` from a fresh
`supabase link` will reproduce the same state if you ever need to rebuild.

---

## 3. Create your admin account

Auth users can't be safely hand-inserted via SQL (password hashing is
GoTrue's job), so use the included script, which calls the Admin API:

```bash
npm install   # needed once, so @supabase/supabase-js is present

SUPABASE_URL="https://hjcglwesrybxbztaukoc.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<Project Settings -> API Keys -> service_role secret>" \
ADMIN_EMAIL="benjaminzelalem@gmail.com" \
ADMIN_PASSWORD="123456789" \
node supabase/seed-admin.mjs
```

This creates the user (pre-confirmed, no email verification needed) and
grants the `admin` role. Log in at `/auth` (or `/aleka` if not signed in)
with that email/password.

> **Security note:** `123456789` is a very weak password. Change it
> immediately after first login (Supabase Auth → the user → or add a
> "change password" flow in-app). Never commit the service role key
> anywhere, and don't reuse it beyond this one script run.

---

## 4. Environment variables

**Frontend (`.env`, and mirrored in Netlify → Site settings → Environment
variables):**

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://hjcglwesrybxbztaukoc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_MU9EatOzmQDC6hvhH7ZU7Q_dzSNPfAs` |
| `VITE_SUPABASE_PROJECT_ID` | `hjcglwesrybxbztaukoc` |

These are safe to expose client-side — it's the publishable/anon key, and
every table is protected by RLS.

**Edge Functions** (set in Supabase Dashboard → Edge Functions → each
function → Secrets, *not* in `.env` — these must never reach the browser):

| Function | Secrets needed |
|---|---|
| `admin-users` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase, no action needed) |
| `chapa-init` | `CHAPA_SECRET_KEY`, plus the auto-injected pair above |
| `chapa-webhook` | `CHAPA_SECRET_KEY`, plus the auto-injected pair above |

**✅ Already deployed** — all three functions are live and `ACTIVE` on
`hjcglwesrybxbztaukoc`, each with the correct JWT verification mode:

| Function | `verify_jwt` | Why |
|---|---|---|
| `admin-users` | `true` | Only called by a logged-in admin/editor; their session JWT satisfies this. |
| `chapa-init` | `false` | Called from the public `/donate` page by anonymous visitors. With the new `sb_publishable_...` key format, the client strips the `Authorization` header entirely for unauthenticated calls (see `src/integrations/supabase/client.ts`) — `verify_jwt: true` would reject every donation with a 401 before the function even ran. |
| `chapa-webhook` | `false` | Called directly by Chapa's servers, which never send a Supabase JWT. It authenticates the payment itself by re-verifying the transaction with Chapa's API. |

These settings are pinned in `supabase/config.toml` under
`[functions.<name>]` so a future `supabase functions deploy` from the CLI
won't silently flip them back to the (unsafe-for-these-two) default of
`true`.

**Still needed from you:** the `CHAPA_SECRET_KEY` secret — this can't be
set through the connector (secrets aren't exposed to it), only via the
dashboard or CLI:

```bash
supabase link --project-ref hjcglwesrybxbztaukoc
supabase secrets set CHAPA_SECRET_KEY="<your Chapa secret key>"
```

or Dashboard → Edge Functions → (each function) → Secrets. Until this is
set, everything else on the site works; only `/donate` will return a
"Chapa is not configured" error.

---

## 5. Local development

```bash
npm install
npm run dev
```

## 6. Build & deploy to Netlify

```bash
npm run build   # outputs to dist/
```

`netlify.toml` already sets the build command (`npm run build`), publish
directory (`dist`), and an SPA catch-all redirect (`/* -> /index.html`,
200), with `public/_redirects` as a backup for the same rule. In Netlify:

1. Connect the repo (or drag-and-drop `dist/` for a one-off deploy).
2. Add the three `VITE_*` environment variables from the table above under
   **Site settings → Environment variables**.
3. Deploy. Client-side routing (all `/aleka/*`, `/news/*`, etc.) will work
   correctly on refresh/direct-link thanks to the SPA redirect.

---

## 7. Full audit notes

- **Build/type-check:** this sandbox has no network access, so I could not
  run `npm install && npm run build` here. I instead cross-checked every
  Supabase table/column read or written in `src/lib/cms-admin.ts`,
  `src/lib/cms-public.ts`, `src/lib/donations.ts`, and all three edge
  functions against the schema — everything matches, and the pre-existing
  `src/integrations/supabase/types.ts` (generated from the *original*
  live database) matches the rebuilt schema column-for-column, which is
  strong independent confirmation the schema is right. Please run
  `npm install && npm run build` once locally/on Netlify as a final check.
- **Routing:** TanStack Router, file-based, `routeTree.gen.ts` present;
  root error/not-found boundaries exist; SPA redirect configured for
  Netlify.
- **Auth:** signup → `handle_new_user()` trigger creates a `profiles` row;
  login/logout via `supabase.auth`; password reset uses standard Supabase
  flows (no custom code needed); admin/editor gating happens both in the
  UI (`/aleka` layout) and, more importantly, at the database layer via
  RLS — so even if a UI check were bypassed, data access is still enforced
  server-side.
- **Storage:** bucket is private; all reads go through signed URLs
  (`src/lib/media-url.ts`, 7-day TTL), all writes require `admin` or
  `editor` role, enforced by storage RLS policies.
- **No remaining Lovable references** anywhere in the codebase (verified
  via full-repo search).
---

## Changelog — Production-readiness upgrade (this session)

### 1. Auth & admin access — fixed
Root cause of "Awaiting access": your account was created directly in the
Supabase dashboard, which creates an `auth.users` row but not a matching
`user_roles` row. I granted your account `admin` directly via SQL — log out
and back in and you'll land on the dashboard. Also added:
- **Disable/reactivate** accounts (new `set_banned` action in the
  `admin-users` edge function, using `auth.admin.updateUserById` with
  `ban_duration`), with a status column and toggle button in Users & Roles.
- The login flow itself was already correct (plain `signInWithPassword`,
  no extra gating) — the fix was data, not code.

### 2. GitHub workflow
I have no GitHub credentials and this sandbox has no network access to
github.com, so I can't push on your behalf. See `GITHUB_WORKFLOW.md` for the
one-time setup to connect this repo to GitHub + Netlify yourself, after
which every future change is a normal `git pull`.

### 3. Branding
- Replaced the navbar/footer logo, which was pointing at a broken Lovable
  CDN URL (`/__l5e/assets-v1/...` — would have 404'd on any non-Lovable
  deploy) with your real logo, bundled as a proper static asset.
- Generated a full favicon/icon set from your logo: `favicon.ico`,
  16/32/48px PNGs, apple-touch-icon, 192/512px app icons, and a 1200×630
  Open Graph image — all wired into `index.html`.
- Added the logo to the login page and admin sidebar (neither had one).
- Admin can now override the logo/favicon/footer logo per-site via Website
  Settings; falls back to the bundled asset if left blank.

### 4. Website Settings module
New `site_settings` table (singleton row) + `/aleka/settings` admin page
covering organization info, contact info, social links, branding uploads,
SEO, homepage stats, hero/CTA copy, footer text, and donation info. Wired
into Navbar, Footer, homepage, About, Contact, Socials, and Donate pages —
see `src/lib/site-settings.ts`.

### 5. Homepage statistics
The 4 stat-strip numbers (children supported, years of impact, partner
clinics, volunteers & staff) are now editable in Website Settings and
reflected on the homepage immediately after saving.

### 6/7. Staff & Partners management
Already had full CRUD (name, position/role, bio, photo, display order,
active/inactive via draft/published status) from the earlier migration —
no changes needed here.

### 8. Gallery — album system
- `gallery_categories` gained `description` and `cover_image_url` columns.
- Admin: new **Albums** dialog (create/edit/delete albums with name,
  description, and cover image — previously you could only add/delete a
  bare category name).
- Admin: bulk upload now has a drag-and-drop zone plus an album picker, so
  multiple images land in the chosen album in one action, with live
  progress (`Uploading n/total…`).
- Admin: reorder via up/down controls (no drag-and-drop library was in the
  project; adding one just for this felt like unnecessary weight for a
  charity site — shout if you'd like true drag-reordering added).
- Public: albums display with an explicit cover image and description
  when set (falls back to the first photo / an auto-generated blurb
  otherwise) — the lightbox, lazy loading, and expand animation were
  already in place from the earlier build.

### 9. Socials page
YouTube handle fixed to `@adeycerebralpalsy` (via Website Settings, not
hardcoded). All three buttons (YouTube, TikTok, Telegram) now resolve from
settings and hide themselves if left blank, instead of pointing at
placeholder `@adeycp` URLs that weren't yours.

### 10. Dynamic content
Wired to Website Settings: phone numbers, email, address, footer text,
copyright, homepage hero heading/subtext, homepage stats, contact page
details, donation info blurb, organization description/mission/vision,
social links, and the homepage CTA section. Left as designed static content
(not turned into individually-editable CMS fields): the secondary "94% /
6 regions / 3.5k sessions" stat cards, program descriptions, and the About
page's milestones/values sections — these are narrative design content
rather than data that changes over time, and making every sentence on the
site editable would mean building a full page-builder, which felt like
scope beyond "no hardcoded contact info or branding."

### 11. Final review
- Ran Supabase's security & performance advisors after all schema changes:
  clean except the expected public-insert warning on `contact_messages`
  (by design) and a generic "leaked password protection disabled" project
  setting (unrelated to this work — worth turning on in Auth settings,
  especially given the admin password in use).
- Verified table structure, RLS, and the `media` bucket directly against
  the live database (not just generated SQL).
- Redeployed `admin-users` with the new disable/reactivate action.
- Could **not** run `npm install && npm run build` — this sandbox has no
  network access. I did a full manual pass instead: traced every new
  Supabase query and mutation against the live schema, checked every edited
  file for coherent imports/JSX, and confirmed `routeTree.gen.ts` will
  auto-regenerate on your first `npm run dev`/`build` (it's a Vite plugin,
  not something to hand-edit). Please run the real build once locally as
  the final gate before deploying.

