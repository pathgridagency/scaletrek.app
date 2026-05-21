-- ScaleTrek — Phase 32: repair public_profiles view.
--
-- Regression: Phase 25 rebuilt public_profiles to add is_elite but based the
-- rewrite on a pre-Phase-22 definition, dropping all 14 extended profile
-- columns (avatar_url, cover_url, headline, location, website, socials,
-- business fields). The app's fetchProfile selects those columns, so every
-- login threw `column public_profiles.avatar_url does not exist` (42703).
--
-- This rebuilds the view with the Phase 22 columns AND is_elite, keeping the
-- investor-privacy masking. Idempotent.

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
       then null else p.avatar_url end                          as avatar_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.cover_url end                           as cover_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.headline end                            as headline,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.location end                            as location,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.website end                             as website,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.linkedin_url end                        as linkedin_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.twitter_url end                         as twitter_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.instagram_url end                       as instagram_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.github_url end                          as github_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.facebook_url end                        as facebook_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.company_name end                        as company_name,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.sector end                              as sector,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.founded_year end                        as founded_year,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.team_size end                           as team_size,
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
  is_elite(p.id)                                                as is_elite,
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;

grant select on public_profiles to authenticated;
