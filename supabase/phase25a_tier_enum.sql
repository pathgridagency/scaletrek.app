-- ScaleTrek — Phase 25a: just the enum extension. Postgres requires the ADD
-- VALUE to commit before any other statement can reference 'elite', so this
-- runs ahead of phase25_tiers.sql in its own transaction.
-- Idempotent.

do $$ begin
  alter type subscription_tier add value if not exists 'elite';
exception when others then null; end $$;
