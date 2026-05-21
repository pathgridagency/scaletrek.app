-- ScaleTrek — Phase 26: Privacy Policy + Terms of Service acceptance tracking.
-- Stores which version of each document a user has accepted and when. Lets us
-- prompt re-acceptance when the document version bumps.
-- Idempotent.

create table if not exists legal_acceptances (
  user_id      uuid not null references profiles(id) on delete cascade,
  document     text not null check (document in ('privacy', 'terms')),
  version      text not null,
  accepted_at  timestamptz not null default now(),
  primary key (user_id, document)
);
create index if not exists legal_acceptances_doc_idx on legal_acceptances(document, version);

alter table legal_acceptances enable row level security;

drop policy if exists legal_acceptances_self on legal_acceptances;
create policy legal_acceptances_self on legal_acceptances for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists legal_acceptances_admin on legal_acceptances;
create policy legal_acceptances_admin on legal_acceptances for all
  using (is_admin()) with check (is_admin());
