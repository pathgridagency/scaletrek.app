-- ScaleTrek — Phase 8: OAuth wiring
-- Adds profile_complete so OAuth users get routed through the
-- post-signup CompleteProfileScreen on first launch.
-- Idempotent.

-- profile_complete: false for fresh OAuth sign-ups, true for email sign-ups
-- (set after the SignupScreen patch step) and for all already-existing rows.
alter table profiles
  add column if not exists profile_complete boolean not null default false;

-- Mark all existing rows as complete (they were created before this column).
update profiles set profile_complete = true where profile_complete = false;

-- Replace the handle_new_user trigger: an email signup carries metadata
-- like name/username/role; OAuth signups do not. We auto-mark complete
-- only if explicit role metadata was provided.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta_name     text := coalesce(new.raw_user_meta_data->>'name', '');
  meta_username text := coalesce(new.raw_user_meta_data->>'username', '');
  meta_avatar   text := coalesce(new.raw_user_meta_data->>'avatar', '');
  meta_role     text := coalesce(new.raw_user_meta_data->>'role', '');
  derived_name  text;
  derived_user  text;
  derived_av    text;
  is_complete   boolean;
begin
  derived_name := case
    when meta_name <> '' then meta_name
    when new.raw_user_meta_data->>'full_name' is not null
      then new.raw_user_meta_data->>'full_name'
    else split_part(coalesce(new.email, 'user@example.com'), '@', 1)
  end;
  derived_user := case
    when meta_username <> '' then meta_username
    else '@' || lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-z0-9]', '', 'g'))
                 || substring(replace(new.id::text, '-', ''), 1, 4)
  end;
  derived_av := case
    when meta_avatar <> '' then meta_avatar
    else upper(substring(derived_name, 1, 2))
  end;
  -- profile_complete: true only if email signup included role metadata
  is_complete := meta_role <> '';

  insert into profiles (id, name, username, avatar, profile_complete)
  values (new.id, derived_name, derived_user, derived_av, is_complete)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user on auth.users;
create trigger trg_on_auth_user after insert on auth.users
  for each row execute function handle_new_user();

-- Rebuild the public_profiles view to expose profile_complete.
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
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;
grant select on public_profiles to authenticated;
