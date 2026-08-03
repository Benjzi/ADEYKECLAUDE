# GitHub Workflow

I don't have the ability to push directly to your GitHub account — I have no
GitHub credentials and this sandbox has no network access to github.com. What
I *can* do is keep handing you a git-ready project (this one already is) so
connecting it to GitHub yourself is a five-minute, one-time task. After that,
every future update from me is just a `git pull` away.

## One-time setup (you do this once)

1. Create an empty repository on GitHub (don't initialize it with a README).
2. In a terminal, from this project's folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — migrated from Lovable to standalone Supabase + Netlify"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. Connect that repo to Netlify (Netlify → Add new site → Import an existing
   project → pick the repo). Netlify will pick up `netlify.toml` automatically
   (build command `npm run build`, publish dir `dist`). Add the three
   `VITE_*` environment variables from `MIGRATION.md` under **Site settings →
   Environment variables**.
4. From now on, every push to `main` auto-deploys to Netlify.

## Going forward: how updates work

Since I can't push for you, the fastest loop is:

1. Ask me for a change in chat.
2. I make the change in my workspace and hand you an updated project (zip,
   or specific files/diffs if you'd rather patch just a few files).
3. You apply it to your local clone and push:
   ```bash
   git add .
   git commit -m "Describe the change"
   git push
   ```
4. Netlify deploys automatically.

If you'd rather skip step 2/3 entirely, two options that get you closer to
true "just pull, no zips":

- **Give me GitHub access** isn't possible in this chat interface — I have
  no way to authenticate to GitHub from here, regardless of what's requested.
- **Use Claude Code** (Anthropic's CLI/IDE tool) locally, pointed at your
  cloned repo. It can read your repo, make commits, and push directly,
  because it runs on your machine with your own git credentials — unlike
  this chat, which only has a sandboxed, network-isolated workspace.

## Keeping the repo production-ready

- `main` should always be deploy-ready — Netlify will build whatever's on it.
- Use feature branches + PRs if more than one person touches the code, and
  merge to `main` only when it's ready to go live.
- Supabase schema changes belong in `supabase/migrations/` (one file per
  change, timestamped) so the database has the same history as the code.
  Apply new migrations to your live project via `supabase db push` (with the
  CLI linked to your project) or by pasting the SQL into the Supabase SQL
  Editor.
- Never commit `.env` — `.gitignore` already excludes it. Use `.env.example`
  as the template for what variables are needed.
