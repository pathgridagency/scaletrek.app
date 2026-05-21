-- ScaleTrek — Phase 17: enable realtime (postgres_changes) on the tables the
-- client subscribes to. Adding a table to supabase_realtime is idempotent; we
-- swallow duplicates so the migration can re-run.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'posts','post_likes','post_signals','post_media',
      'messages','threads',
      'notifications',
      'deals',
      'follows'
    ])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'skipping % (%): %', t, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
