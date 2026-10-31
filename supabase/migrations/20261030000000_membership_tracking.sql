-- Membership registrations: fix the RLS error + automatic, accurate tracking.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. FIX: "new row violates row-level security policy for table
--    membership_registrations". The insert policy only covered the `anon`
--    role, so anyone logged in to the admin in the same browser (role
--    `authenticated`) was rejected. Allow both.
-- ---------------------------------------------------------------------------
drop policy if exists "membership_public_insert" on public.membership_registrations;
create policy "membership_public_insert" on public.membership_registrations
  for insert to anon, authenticated with check (true);
grant insert on public.membership_registrations to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Track who registered and when.
--    source = 'website'     detected on the site (no identity, just the time)
--             'google_form' confirmed by the Google Form itself (who + when)
--             'legacy'      rows created by the old "I've submitted" button
-- ---------------------------------------------------------------------------
alter table public.membership_registrations
  add column if not exists source text,
  add column if not exists response_id text,
  add column if not exists submitted_at timestamptz,
  add column if not exists answers jsonb;

update public.membership_registrations set source = 'legacy' where source is null;
update public.membership_registrations set submitted_at = created_at where submitted_at is null;

alter table public.membership_registrations alter column source set default 'website';
alter table public.membership_registrations alter column source set not null;
alter table public.membership_registrations alter column submitted_at set default now();

-- One row per Google Form response, so a retried webhook can never double count.
create unique index if not exists membership_registrations_response_id_key
  on public.membership_registrations (response_id) where response_id is not null;
create index if not exists membership_registrations_submitted_idx
  on public.membership_registrations (submitted_at desc);

-- How many pages (sections) the embedded Google Form has. Used to tell the
-- final "Submit" apart from "Next" when detecting a submission on the site.
alter table public.site_settings
  add column if not exists membership_form_pages integer not null default 1;

-- ---------------------------------------------------------------------------
-- 3. Functions (callable by visitors; they can only add, never read or edit)
-- ---------------------------------------------------------------------------

-- Called by the Membership page when it sees the form's confirmation screen.
create or replace function public.record_website_registration()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.membership_registrations (source) values ('website');
  return public.membership_count();
end;
$$;

-- True once the Google Form script has reported at least one response.
create or replace function public.membership_google_connected()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.membership_registrations where source = 'google_form');
$$;

-- Called by the Google Form's own script for EVERY response (who + when).
-- Replaces the matching anonymous "website" row, so nobody is counted twice.
create or replace function public.record_google_registration(
  p_response_id  text,
  p_full_name    text default null,
  p_email        text default null,
  p_submitted_at timestamptz default null,
  p_answers      jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new   uuid;
  v_at    timestamptz := coalesce(p_submitted_at, now());
  v_match uuid;
begin
  if p_response_id is null or length(trim(p_response_id)) = 0 then
    raise exception 'p_response_id is required';
  end if;

  insert into public.membership_registrations (full_name, email, submitted_at, source, response_id, answers)
  values (
    left(nullif(trim(p_full_name), ''), 200),
    left(nullif(trim(p_email), ''), 320),
    v_at,
    'google_form',
    trim(p_response_id),
    case when p_answers is not null and pg_column_size(p_answers) <= 20000 then p_answers end
  )
  on conflict (response_id) where response_id is not null do nothing
  returning id into v_new;

  if v_new is not null then
    select r.id into v_match
      from public.membership_registrations r
     where r.source = 'website'
       and r.created_at between v_at - interval '2 minutes' and v_at + interval '10 minutes'
     order by abs(extract(epoch from (r.created_at - v_at)))
     limit 1;
    if v_match is not null then
      delete from public.membership_registrations where id = v_match;
    end if;
  end if;

  return public.membership_count();
end;
$$;

revoke execute on function public.record_website_registration() from public;
revoke execute on function public.membership_google_connected() from public;
revoke execute on function public.record_google_registration(text, text, text, timestamptz, jsonb) from public;
grant execute on function public.record_website_registration() to anon, authenticated;
grant execute on function public.membership_google_connected() to anon, authenticated;
grant execute on function public.record_google_registration(text, text, text, timestamptz, jsonb) to anon, authenticated;
