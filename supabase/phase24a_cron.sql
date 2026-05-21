-- ScaleTrek — Phase 24a: schedule the purge-stories Edge Function hourly via
-- pg_cron + pg_net. Lives separately because pg_cron is in the `extensions`
-- schema and unschedule-then-schedule is idempotent.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Drop any prior schedule with this name so re-running is safe.
do $$
begin
  perform cron.unschedule('purge-stories-hourly');
exception when others then null;
end $$;

select cron.schedule(
  'purge-stories-hourly',
  '0 * * * *',
  $job$
  select net.http_post(
    url     := 'https://yhezvbyngzimzmoyhtjl.supabase.co/functions/v1/purge-stories',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $job$
);
