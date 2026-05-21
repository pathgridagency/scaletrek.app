-- ScaleTrek — Phase 29: fix infinite-recursion bug in profiles_read policy.
--
-- Phase 7 defined the policy with an inline subquery against profiles:
--
--   exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
--
-- That subquery re-evaluates profiles_read, causing recursion whenever any
-- SELECT/FK-validation touches a row that doesn't immediately match the first
-- OR branch (e.g. FK validation when inserting a post). The result is
-- "infinite recursion detected in policy for relation 'profiles'" 42P17.
--
-- Fix: replace the inline subquery with the existing `is_admin()` helper,
-- which is SECURITY DEFINER and therefore bypasses RLS on the profiles
-- query inside it.
-- Idempotent.

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or role <> 'investor'
    or is_admin()
    or can_see_investor(id)
  );
