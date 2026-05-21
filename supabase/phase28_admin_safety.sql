-- ScaleTrek — Phase 28: admin safety guardrails.
-- 1. A user cannot change their own role (admins must be promoted/demoted by
--    a different admin).
-- 2. The LAST admin in the system cannot be demoted — at least one admin must
--    always exist.
-- Idempotent.

create or replace function enforce_role_change_rules()
returns trigger
language plpgsql
as $$
declare
  caller uuid := auth.uid();
  remaining_admins int;
begin
  -- If role didn't actually change, allow.
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Service-role calls (caller is null) bypass these checks so server-side
  -- migrations / Edge Functions can still flip roles when needed.
  if caller is null then
    return new;
  end if;

  -- 1. Block self role-change. Even another admin acting on themselves can't
  --    promote/demote — they must use a second admin account.
  if caller = new.id then
    raise exception using
      errcode = '42501',
      message = 'You cannot change your own role.';
  end if;

  -- 2. If this update would demote the only admin, refuse.
  if old.role = 'admin' and new.role <> 'admin' then
    select count(*) into remaining_admins from profiles
      where role = 'admin' and id <> new.id;
    if remaining_admins = 0 then
      raise exception using
        errcode = '42501',
        message = 'Cannot demote the last admin — promote another user first.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_role_change on profiles;
create trigger trg_enforce_role_change
  before update of role on profiles
  for each row execute function enforce_role_change_rules();
