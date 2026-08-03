# Adey CP Website

Standalone Vite + React SPA using Supabase (database, auth, storage) and
Chapa (donations, via Supabase Edge Functions).

## Deploy on Netlify

1. Set these environment variables in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
2. Build command: `npm run build`
3. Publish directory: `dist`
4. SPA fallback is preconfigured via `netlify.toml` and `public/_redirects`.

## Supabase setup

Run migrations under `supabase/migrations/` on your Supabase project (or via
`supabase db push`), then deploy the edge functions in `supabase/functions/`:

```bash
supabase functions deploy chapa-init
supabase functions deploy chapa-webhook
supabase functions deploy admin-users
supabase secrets set CHAPA_SECRET_KEY=... # required for donations
```

## Admin

The admin panel lives at `/aleka`. Grant users `admin` or `editor` roles via
the `user_roles` table (either directly, or seed the first admin via SQL:

```sql
insert into public.user_roles (user_id, role)
values ('<auth user uuid>', 'admin');
```
