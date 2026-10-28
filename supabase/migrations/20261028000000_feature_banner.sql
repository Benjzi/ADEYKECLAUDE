-- Homepage feature banner (blueprint / master plan / announcement image).
-- Extends the existing singleton site_settings row — no new table.
-- The banner is shown only when enabled AND an image is set.
alter table public.site_settings
  add column if not exists feature_banner_enabled boolean not null default true,
  add column if not exists feature_banner_image_url text,
  add column if not exists feature_banner_title text,
  add column if not exists feature_banner_description text;
