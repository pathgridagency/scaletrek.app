-- ScaleTrek — Phase 22: extended profile fields (avatar image, cover photo,
-- contact / socials, business or personal details). Idempotent.

alter table profiles
  add column if not exists avatar_url       text,
  add column if not exists cover_url        text,
  add column if not exists headline         text,
  add column if not exists location         text,
  add column if not exists website          text,
  add column if not exists linkedin_url     text,
  add column if not exists twitter_url      text,
  add column if not exists instagram_url    text,
  add column if not exists github_url       text,
  add column if not exists facebook_url     text,
  add column if not exists company_name     text,
  add column if not exists sector           text,
  add column if not exists founded_year     int,
  add column if not exists team_size        text;

-- Storage buckets for profile photos. avatars bucket already exists from
-- schema.sql; add a public cover-photos bucket. Both are public-read; only the
-- owner (or admin) can write or delete.
insert into storage.buckets (id, name, public)
  values ('profile-covers', 'profile-covers', true) on conflict do nothing;

drop policy if exists "profile covers owner upload" on storage.objects;
create policy "profile covers owner upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile covers public read" on storage.objects;
create policy "profile covers public read" on storage.objects for select
  using (bucket_id = 'profile-covers');

drop policy if exists "profile covers owner manage" on storage.objects;
create policy "profile covers owner manage" on storage.objects for all
  to authenticated
  using (bucket_id = 'profile-covers' and owner = auth.uid())
  with check (bucket_id = 'profile-covers' and owner = auth.uid());

drop policy if exists "profile covers admin all" on storage.objects;
create policy "profile covers admin all" on storage.objects for all
  to authenticated
  using (bucket_id = 'profile-covers' and is_admin())
  with check (bucket_id = 'profile-covers' and is_admin());

-- Tighten the avatars bucket policies that existed in schema.sql (the original
-- ones allowed anyone authenticated to manage any avatar object). Keep public
-- read; restrict insert/delete to the owner uploading into avatars/<uid>/.
drop policy if exists "avatars rw" on storage.objects;
drop policy if exists "avatars owner upload" on storage.objects;
create policy "avatars owner upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner manage" on storage.objects;
create policy "avatars owner manage" on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars admin all" on storage.objects;
create policy "avatars admin all" on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and is_admin())
  with check (bucket_id = 'avatars' and is_admin());

-- Rebuild public_profiles to expose the new fields. Apply the same investor
-- privacy gating (anon_alias when hidden) to anything that could de-anonymise
-- them: name/username/avatar were already gated; we also mask the new
-- avatar_url, cover_url, headline, location, website, all socials, company
-- details when the investor isn't revealed to the viewer.
drop view if exists public_profiles cascade;
create view public_profiles
  with (security_invoker = false) as
select
  p.id,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then coalesce(p.anon_alias, 'Verified Investor')
       else p.name end                                          as name,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then '@hidden'
       else p.username end                                      as username,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 'IV'
       else p.avatar end                                        as avatar,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.avatar_url end                                    as avatar_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.cover_url end                                     as cover_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.headline end                                      as headline,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.location end                                      as location,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.website end                                       as website,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.linkedin_url end                                  as linkedin_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.twitter_url end                                   as twitter_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.instagram_url end                                 as instagram_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.github_url end                                    as github_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.facebook_url end                                  as facebook_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.company_name end                                  as company_name,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.sector end                                        as sector,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.founded_year end                                  as founded_year,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null
       else p.team_size end                                     as team_size,
  p.role,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 'Identity revealed only after engagement.'
       else coalesce(p.bio, '') end                             as bio,
  p.industry,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.momentum_score end                         as momentum_score,
  p.verification_level,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.followers end                              as followers,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.following end                              as following,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.showcase_count end                         as showcase_count,
  p.suspended,
  p.preferred_currency,
  p.preferred_language,
  p.public_key,
  p.joined_at,
  p.reveal_to_all,
  p.profile_complete,
  p.onboarded,
  is_pro(p.id)                                                  as is_pro,
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;
grant select on public_profiles to authenticated;
