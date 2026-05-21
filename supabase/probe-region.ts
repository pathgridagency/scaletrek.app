/* eslint-disable no-console */
import { Client } from 'pg';

const PROJECT_REF = 'yhezvbyngzimzmoyhtjl';
const PASSWORD = 'Fkugglol2020..';

const REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'eu-north-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ca-central-1',
  'sa-east-1',
];

const tryRegion = async (region: string): Promise<boolean> => {
  const url = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(PASSWORD)}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 6000,
  });
  try {
    await client.connect();
    await client.query('select 1');
    await client.end();
    return true;
  } catch (err) {
    try { await client.end(); } catch {}
    return false;
  }
};

const main = async () => {
  for (const region of REGIONS) {
    process.stdout.write(`  trying ${region}... `);
    const ok = await tryRegion(region);
    console.log(ok ? '✓ match' : '·');
    if (ok) {
      console.log(`\nREGION: ${region}`);
      console.log(`Pooler URL: postgresql://postgres.${PROJECT_REF}:***@aws-0-${region}.pooler.supabase.com:5432/postgres`);
      return;
    }
  }
  console.log('\nNo region matched. Project may be in a less common region or password may be wrong.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
