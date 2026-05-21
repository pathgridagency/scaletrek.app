-- ScaleTrek — Phase 16: persist `onboarded` flag on profiles so a wipe-and-
-- reinstall doesn't restart onboarding for users who finished it once.
-- Idempotent.

alter table profiles
  add column if not exists onboarded boolean not null default false;

-- Existing accounts are treated as onboarded (they've already been using the
-- app); only brand-new signups will default to false.
update profiles set onboarded = true where onboarded = false and joined_at < now();

-- Rebuild public_profiles to expose the column. Keep the privacy logic intact.
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
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;
grant select on public_profiles to authenticated;
