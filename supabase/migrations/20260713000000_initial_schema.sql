-- =========================================================
-- Adey CP — full schema for a fresh Supabase project
-- Consolidated from the original project's migration history.
-- Safe to run once, top to bottom, on an empty database
-- (Supabase SQL Editor, or `supabase db push`).
-- =========================================================

-- =========================================================
-- Enums
-- =========================================================
create type public.app_role as enum ('admin', 'editor');
create type public.content_status as enum ('draft', 'scheduled', 'published');

-- =========================================================
-- updated_at helper
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- profiles
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Profiles: users read own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles: users update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- user_roles
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- has_role: SECURITY INVOKER is safe here because RLS on user_roles
-- already lets a user read their own rows, which is all this needs.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Roles: users read own"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Roles: admins read all"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Roles: admins manage"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Profiles: admins read all"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Trigger: create profile on new auth user
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- function grants
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke execute on function public.set_updated_at() from public, anon;
grant execute on function public.set_updated_at() to authenticated, service_role;

-- =========================================================
-- news
-- =========================================================
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null default '',
  cover_image_url text,
  category text,
  tags text[] not null default '{}',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.news to anon;
grant select, insert, update, delete on public.news to authenticated;
grant all on public.news to service_role;

alter table public.news enable row level security;

create policy "News: public reads published"
  on public.news for select
  to anon
  using (status = 'published' and published_at is not null and published_at <= now());

create policy "News: signed-in read published"
  on public.news for select
  to authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

create policy "News: editors read all"
  on public.news for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "News: editors insert"
  on public.news for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "News: editors update"
  on public.news for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "News: admins delete"
  on public.news for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_news_updated
  before update on public.news
  for each row execute function public.set_updated_at();

create index news_status_published_at_idx on public.news (status, published_at desc);
create index news_slug_idx on public.news (slug);

-- =========================================================
-- events
-- =========================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  body text not null default '',
  cover_image_url text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  rsvp_url text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.events to anon;
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;

alter table public.events enable row level security;

create policy "Events: public reads published"
  on public.events for select
  to anon
  using (status = 'published' and published_at is not null and published_at <= now());

create policy "Events: signed-in read published"
  on public.events for select
  to authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

create policy "Events: editors read all"
  on public.events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "Events: editors insert"
  on public.events for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "Events: editors update"
  on public.events for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "Events: admins delete"
  on public.events for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_events_updated
  before update on public.events
  for each row execute function public.set_updated_at();

create index events_status_starts_at_idx on public.events (status, starts_at);
create index events_slug_idx on public.events (slug);

-- =========================================================
-- gallery_categories
-- =========================================================
create table public.gallery_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  event_id uuid references public.events(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_categories_event_idx on public.gallery_categories(event_id);

grant select on public.gallery_categories to anon;
grant select, insert, update, delete on public.gallery_categories to authenticated;
grant all on public.gallery_categories to service_role;

alter table public.gallery_categories enable row level security;

create policy "gc_public_read" on public.gallery_categories for select using (true);

create policy "gc_editor_write" on public.gallery_categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create trigger trg_gc_updated_at before update on public.gallery_categories
  for each row execute function public.set_updated_at();

-- =========================================================
-- gallery_items
-- =========================================================
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  caption text,
  image_url text not null,
  category_id uuid references public.gallery_categories(id) on delete set null,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gi_status_idx on public.gallery_items(status, sort_order);
create index gi_cat_idx on public.gallery_items(category_id);

grant select on public.gallery_items to anon;
grant select, insert, update, delete on public.gallery_items to authenticated;
grant all on public.gallery_items to service_role;

alter table public.gallery_items enable row level security;

create policy "gi_public_read_published" on public.gallery_items for select using (
  status = 'published' and (published_at is null or published_at <= now())
);

create policy "gi_editor_read_all" on public.gallery_items for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor')
);

create policy "gi_editor_write" on public.gallery_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create trigger trg_gi_updated_at before update on public.gallery_items
  for each row execute function public.set_updated_at();

-- =========================================================
-- staff (email/phone hidden from anon via column-level grants)
-- =========================================================
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title text,
  bio text,
  photo_url text,
  email text,
  phone text,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_status_idx on public.staff(status, sort_order);

grant select (id, full_name, role_title, bio, photo_url, sort_order, status, published_at, created_at, updated_at)
  on public.staff to anon;
grant select, insert, update, delete on public.staff to authenticated;
grant all on public.staff to service_role;

alter table public.staff enable row level security;

create policy "staff_public_read_published" on public.staff for select using (
  status = 'published' and (published_at is null or published_at <= now())
);

create policy "staff_editor_read_all" on public.staff for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor')
);

create policy "staff_editor_write" on public.staff for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create trigger trg_staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

-- =========================================================
-- partners
-- =========================================================
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partners_status_idx on public.partners(status, sort_order);

grant select on public.partners to anon;
grant select, insert, update, delete on public.partners to authenticated;
grant all on public.partners to service_role;

alter table public.partners enable row level security;

create policy "partners_public_read_published" on public.partners for select using (
  status = 'published' and (published_at is null or published_at <= now())
);

create policy "partners_editor_read_all" on public.partners for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor')
);

create policy "partners_editor_write" on public.partners for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create trigger trg_partners_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

-- =========================================================
-- donations (Chapa payment records)
-- =========================================================
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  tx_ref text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'ETB',
  donor_name text,
  donor_email text,
  message text,
  status text not null default 'pending' check (status in ('pending','success','failed','cancelled')),
  chapa_reference text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.donations to authenticated;
grant all on public.donations to service_role;

alter table public.donations enable row level security;

create policy "Admins can view donations"
  on public.donations for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger donations_updated_at before update on public.donations
  for each row execute function public.set_updated_at();

create index donations_created_at_idx on public.donations (created_at desc);
create index donations_status_idx on public.donations (status);

-- =========================================================
-- contact_messages
-- =========================================================
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) between 3 and 320),
  subject text check (subject is null or length(subject) <= 200),
  message text not null check (length(message) between 5 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant insert on public.contact_messages to anon;
grant select, insert, update, delete on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;

alter table public.contact_messages enable row level security;

-- Public contact form (anon) can insert.
create policy "cm_public_insert" on public.contact_messages
  for insert to anon with check (true);

-- Only admins/editors can read, update, or delete messages.
create policy "cm_editor_read" on public.contact_messages
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "cm_editor_update" on public.contact_messages
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create policy "cm_admin_delete" on public.contact_messages
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_unread_idx on public.contact_messages (is_read) where is_read = false;

create trigger trg_cm_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();

-- =========================================================
-- Storage: "media" bucket + policies
-- Private bucket — the app always reads via signed URLs
-- (see src/lib/media-url.ts), never public URLs.
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  8388608, -- 8 MB, matches the client-side limit in MediaUpload.tsx
  array['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

create policy "Media: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "Media: editors upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  );

create policy "Media: editors update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  );

create policy "Media: editors delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  );

-- =========================================================
-- site_settings (singleton row — global website settings)
-- =========================================================
create table public.site_settings (
  id int primary key default 1,
  org_name text not null default 'Adey CP Humanitarian Association',
  short_description text,
  long_description text,
  mission text,
  vision text,

  phone_primary text,
  phone_secondary text,
  email text,
  address text,
  maps_url text,
  office_hours text,

  social_facebook text,
  social_instagram text,
  social_tiktok text,
  social_youtube text,
  social_telegram_forum text,
  social_telegram_channel text,
  social_linkedin text,

  logo_url text,
  favicon_url text,
  hero_image_url text,
  footer_logo_url text,

  seo_title text,
  seo_description text,
  seo_keywords text,

  stat_children_supported text,
  stat_years_of_impact text,
  stat_partner_clinics text,
  stat_volunteers_staff text,

  hero_heading text,
  hero_subtext text,
  cta_heading text,
  cta_subtext text,
  footer_text text,
  copyright_text text,
  donation_info text,

  theme_color text,
  impact_stats jsonb not null default '[
    {"n":"94%","l":"of children show measurable progress within 12 months"},
    {"n":"6","l":"regions reached across Ethiopia"},
    {"n":"3.5k","l":"therapy sessions delivered in 2025"},
    {"n":"100%","l":"of donations directly fund programs"}
  ]'::jsonb,
  by_numbers_stats jsonb not null default '[
    {"n":"1,000+","l":"Children served annually"},
    {"n":"10","l":"Years of service"},
    {"n":"12","l":"Regions reached"},
    {"n":"40+","l":"Trained caregivers & therapists"}
  ]'::jsonb,

  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

grant select on public.site_settings to anon;
grant select, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;

alter table public.site_settings enable row level security;

create policy "settings_public_read" on public.site_settings for select using (true);

create policy "settings_editor_update" on public.site_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'editor'));

create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- seed the single settings row with the site's current real-world values
-- (kept in sync with what's live so a from-scratch rebuild looks the same)
insert into public.site_settings (
  id, org_name, short_description, long_description, mission, vision,
  email, social_youtube,
  stat_children_supported, stat_years_of_impact, stat_partner_clinics, stat_volunteers_staff,
  hero_heading, hero_subtext, cta_heading, cta_subtext,
  footer_text, copyright_text, seo_title, seo_description, seo_keywords
) values (
  1,
  'Adey CP Humanitarian Association',
  'Walking alongside children with Cerebral Palsy and their families across Ethiopia.',
  'Adey CP Humanitarian Association was founded in 2016 to change the story for Ethiopian children living with Cerebral Palsy. We combine clinical care, education, and family support because thriving is never a solo effort.',
  'To ensure every child with Cerebral Palsy in Ethiopia has access to therapy, education, and a community that believes in their potential.',
  'A future where disability is never a barrier to dignity, opportunity, or belonging.',
  'benjaminzelalem@gmail.com',
  '@adeycerebralpalsy',
  '1,200+', '9 Years', '14', '40+',
  'Every Child Deserves to Thrive',
  'We walk alongside children with Cerebral Palsy and their families across Ethiopia — providing therapy, dignity, community, and a future full of possibility.',
  'Be part of a child''s next chapter.',
  'Your gift funds therapy, learning materials, and family support that change lives — every birr, dollar and euro reaches a child.',
  'Adey CP Humanitarian Association walks alongside children with Cerebral Palsy and their families across Ethiopia.',
  '© ' || extract(year from now())::text || ' Adey CP Humanitarian Association. All rights reserved.',
  'Adey CP Humanitarian Association — Every Child Deserves to Thrive',
  'We walk alongside children with Cerebral Palsy and their families across Ethiopia — providing therapy, dignity, community, and a future full of possibility.',
  'cerebral palsy, Ethiopia, disability, children, therapy, humanitarian, NGO'
)
on conflict (id) do nothing;
