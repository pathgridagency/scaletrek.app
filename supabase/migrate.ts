/* eslint-disable no-console */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const loadEnv = (): Record<string, string> => {
  const envPath = path.join(HERE, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
};

const ADMIN_EMAIL = 'scaletrek.app@gmail.com';
const ADMIN_PASSWORD = 'KILLMILL2025@@';
const ADMIN_NAME = 'ScaleTrek';
const ADMIN_USERNAME = '@ScaleTrek';
const ADMIN_AVATAR = 'ST';

const readSql = (file: string): string =>
  fs.readFileSync(path.join(HERE, file), 'utf8');

const runFile = async (client: Client, file: string) => {
  console.log(`▶ ${file}`);
  const sql = readSql(file);
  await client.query(sql);
  console.log(`  ✓ ${file} applied`);
};

const main = async () => {
  const env = loadEnv();
  const connectionString = env.DATABASE_URL;
  if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
    throw new Error('DATABASE_URL is not configured in .env');
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Supabase...');
  await client.connect();
  const probe = await client.query<{ now: Date; v: string }>(
    'select now() as now, version() as v',
  );
  console.log(`  ✓ connected · server time ${probe.rows[0].now.toISOString()}`);
  console.log(`  · ${probe.rows[0].v.split(',')[0]}`);

  await runFile(client, 'schema.sql');
  await runFile(client, 'policies.sql');
  await runFile(client, 'phase7_privacy.sql');
  await runFile(client, 'phase8_oauth.sql');
  await runFile(client, 'phase11_blocks.sql');
  await runFile(client, 'phase13_decks.sql');
  await runFile(client, 'phase14_media.sql');
  await runFile(client, 'phase16_onboarded.sql');
  await runFile(client, 'phase17_realtime.sql');
  await runFile(client, 'phase18_subscriptions.sql');
  await runFile(client, 'phase19_pro_interest.sql');
  await runFile(client, 'phase22_profile_extras.sql');
  await runFile(client, 'phase24_stories.sql');
  await runFile(client, 'phase25a_tier_enum.sql');
  await runFile(client, 'phase25_tiers.sql');
  await runFile(client, 'phase26_legal.sql');
  await runFile(client, 'phase27_features.sql');
  await runFile(client, 'phase28_admin_safety.sql');
  await runFile(client, 'phase29_fix_profiles_recursion.sql');
  await runFile(client, 'phase30_post_moderation.sql');
  await runFile(client, 'phase32_fix_public_profiles.sql');
  await runFile(client, 'phase33_story_engagement.sql');
  await runFile(client, 'phase34_synergy_match.sql');
  await runFile(client, 'seed.sql');

  console.log('▶ wiping existing users...');
  const wipe = await client.query('delete from auth.users');
  console.log(`  ✓ removed ${wipe.rowCount ?? 0} auth users (profiles cascade)`);

  console.log('▶ creating admin user...');
  // The handle_new_user trigger from schema.sql auto-creates the profile row
  // off auth.users.raw_user_meta_data, so we provide name/username/avatar there.
  await client.query(
    `
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      $1,
      crypt($2, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      $3::jsonb,
      now(),
      now(),
      '', '', '', ''
    )
    `,
    [
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      JSON.stringify({ name: ADMIN_NAME, username: ADMIN_USERNAME, avatar: ADMIN_AVATAR }),
    ],
  );

  // Elevate the auto-created profile to admin.
  const elevation = await client.query(
    `
    update profiles
       set role = 'admin',
           verification_level = 'elite',
           momentum_score = 100,
           bio = 'Platform operator.'
     where id = (select id from auth.users where email = $1)
    returning id, username, role, verification_level
    `,
    [ADMIN_EMAIL],
  );

  if (elevation.rowCount === 0) {
    throw new Error('Profile row was not created by trigger — verify handle_new_user is installed.');
  }

  console.log('  ✓ admin profile:', elevation.rows[0]);
  console.log('All migrations applied successfully.');

  await client.end();
};

main().catch((err) => {
  console.error('Migration failed:');
  console.error(err);
  process.exit(1);
});
