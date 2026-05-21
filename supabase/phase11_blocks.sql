-- ScaleTrek — Phase 11: user blocks
-- Lets a user hide another user's profile/posts/comments client-side.
-- Idempotent.

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  reason     text default '',
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocker_idx on blocks(blocker_id);

alter table blocks enable row level security;

drop policy if exists blocks_self_read   on blocks;
drop policy if exists blocks_self_write  on blocks;
drop policy if exists blocks_admin_all   on blocks;

create policy blocks_self_read on blocks
  for select to authenticated
  using (blocker_id = auth.uid() or is_admin());

create policy blocks_self_write on blocks
  for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy blocks_admin_all on blocks
  for all to authenticated using (is_admin()) with check (is_admin());
