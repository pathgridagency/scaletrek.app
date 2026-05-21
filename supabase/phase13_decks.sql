-- ScaleTrek — Phase 13: NDA + deck-share flow
-- Founders upload a deck to a private Storage bucket and grant an investor
-- a time-limited signed URL ONLY after the investor signs the NDA in-app.
-- Idempotent.

-- ───────────────────────── storage bucket ─────────────────────────
insert into storage.buckets (id, name, public)
  values ('decks', 'decks', false) on conflict do nothing;

-- ───────────────────────── deck_shares table ──────────────────────
create table if not exists deck_shares (
  id              uuid primary key default gen_random_uuid(),
  founder_id      uuid not null references profiles(id) on delete cascade,
  investor_id     uuid not null references profiles(id) on delete cascade,
  file_path       text not null,                            -- storage object path
  filename        text not null,                            -- original filename
  size_bytes      bigint,
  nda_text        text not null default 'I agree to keep all information shared confidential.',
  nda_signed_at   timestamptz,                              -- null until investor signs
  granted_at      timestamptz,                              -- when founder issued the link
  expires_at      timestamptz,                              -- signed-URL TTL boundary
  revoked         boolean not null default false,
  created_at      timestamptz not null default now(),
  check (founder_id <> investor_id)
);
create index if not exists deck_shares_investor_idx on deck_shares(investor_id);
create index if not exists deck_shares_founder_idx  on deck_shares(founder_id);

alter table deck_shares enable row level security;

drop policy if exists deck_shares_participants_read   on deck_shares;
drop policy if exists deck_shares_founder_write       on deck_shares;
drop policy if exists deck_shares_investor_sign       on deck_shares;
drop policy if exists deck_shares_admin_all           on deck_shares;

-- Either party can read their own rows.
create policy deck_shares_participants_read on deck_shares
  for select to authenticated
  using (founder_id = auth.uid() or investor_id = auth.uid() or is_admin());

-- Only the founder can insert/update non-NDA columns (file_path, expires_at, revoked).
create policy deck_shares_founder_write on deck_shares
  for all to authenticated
  using (founder_id = auth.uid())
  with check (founder_id = auth.uid());

-- The investor can flip nda_signed_at on their own row (the trigger below
-- locks this down to that single column).
create policy deck_shares_investor_sign on deck_shares
  for update to authenticated
  using (investor_id = auth.uid())
  with check (investor_id = auth.uid());

create policy deck_shares_admin_all on deck_shares
  for all to authenticated using (is_admin()) with check (is_admin());

-- Trigger: investor's update can only touch nda_signed_at — never other cols.
create or replace function lock_investor_update_cols() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = new.investor_id and auth.uid() <> new.founder_id then
    if
      new.founder_id  <> old.founder_id  or
      new.investor_id <> old.investor_id or
      new.file_path   <> old.file_path   or
      new.filename    <> old.filename    or
      coalesce(new.size_bytes, -1) <> coalesce(old.size_bytes, -1) or
      coalesce(new.nda_text, '')  <> coalesce(old.nda_text, '')  or
      coalesce(new.granted_at, 'epoch'::timestamptz) <> coalesce(old.granted_at, 'epoch'::timestamptz) or
      coalesce(new.expires_at, 'epoch'::timestamptz) <> coalesce(old.expires_at, 'epoch'::timestamptz) or
      new.revoked <> old.revoked
    then
      raise exception 'Investor can only sign the NDA; other columns are immutable to them.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_investor_update_cols on deck_shares;
create trigger trg_lock_investor_update_cols before update on deck_shares
  for each row execute function lock_investor_update_cols();

-- ────────────────────── storage RLS for decks bucket ──────────────
-- Founders can upload to decks/<their-uuid>/*. Investors can READ a deck
-- object only when they have a deck_shares row with nda_signed_at NOT NULL
-- AND (expires_at IS NULL OR expires_at > now()) AND revoked = false.
drop policy if exists "decks founder upload" on storage.objects;
drop policy if exists "decks founder manage" on storage.objects;
drop policy if exists "decks investor read"  on storage.objects;
drop policy if exists "decks admin all"      on storage.objects;

create policy "decks founder upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'decks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "decks founder manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'decks' and owner = auth.uid())
  with check (bucket_id = 'decks' and owner = auth.uid());

create policy "decks investor read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'decks'
    and exists (
      select 1 from deck_shares d
      where d.file_path = storage.objects.name
        and d.investor_id = auth.uid()
        and d.nda_signed_at is not null
        and d.revoked = false
        and (d.expires_at is null or d.expires_at > now())
    )
  );

create policy "decks admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'decks' and is_admin())
  with check (bucket_id = 'decks' and is_admin());
