/* eslint-disable no-console */
// Seeds 50 demo founders + a spread of dreamer / reality-check posts across
// quality tiers so the live app shows a populated, believable feed.
//
//   npx tsx supabase/seed-demo-accounts.ts
//
// Idempotent: every run first removes prior demo rows (email domain
// @demo.scaletrek.app) and their cascaded profiles / posts, then re-seeds.
// Leaves the real admin account and any genuine user data untouched.
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const loadEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(HERE, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const e = t.indexOf('=');
    if (e > 0) out[t.slice(0, e).trim()] = t.slice(e + 1).trim();
  }
  return out;
};

const PASSWORD = 'ScaleTrek2026!';
const EMAIL_DOMAIN = 'demo.scaletrek.app';

const FIRST = [
  'Amine', 'Yasmine', 'Karim', 'Nour', 'Sofia', 'Omar', 'Lina', 'Youssef', 'Salma', 'Mehdi',
  'Aya', 'Bilal', 'Hajar', 'Reda', 'Imane', 'Tariq', 'Sara', 'Anas', 'Khadija', 'Zakaria',
  'Maya', 'Hamza', 'Rim', 'Ayoub', 'Ghita', 'Adam', 'Lea', 'Nabil', 'Dounia', 'Saad',
  'Chaimae', 'Walid', 'Asma', 'Ilyas', 'Meryem', 'Ziad', 'Hiba', 'Marwan', 'Salwa', 'Othmane',
  'Ines', 'Rayan', 'Loubna', 'Hamid', 'Nadia', 'Soufiane', 'Kenza', 'Jad', 'Farah', 'Anwar',
];
const LAST = [
  'El Amrani', 'Bennani', 'Tazi', 'Cherkaoui', 'Idrissi', 'El Fassi', 'Benjelloun', 'Alaoui',
  'Berrada', 'Sbai', 'Lahlou', 'Naciri', 'Bensouda', 'Chraibi', 'Kabbaj', 'El Mansouri',
  'Sefrioui', 'Bouhlal', 'Zniber', 'Lamrani', 'Squalli', 'Belkadi', 'Hassani', 'Ouazzani',
  'El Ghazali',
];

const INDUSTRIES = [
  'FinTech', 'AgriTech', 'HealthTech', 'EdTech', 'E-commerce', 'SaaS', 'CleanTech', 'FoodTech',
  'Logistics', 'Creator Economy', 'PropTech', 'Mobility', 'Fashion Tech', 'TravelTech', 'InsurTech',
  'Gaming',
];
const CITIES = [
  'Casablanca, Morocco', 'Rabat, Morocco', 'Marrakesh, Morocco', 'Dubai, UAE', 'Tunis, Tunisia',
  'Cairo, Egypt', 'Lagos, Nigeria', 'Nairobi, Kenya', 'Paris, France', 'Riyadh, Saudi Arabia',
];

const SKILLS = [
  'Product Design', 'Growth Marketing', 'Fundraising', 'Software Engineering', 'Supply Chain',
  'Sales', 'Content Creation', 'Data Science', 'Operations', 'Brand Strategy', 'Community Building',
  'UX Research', 'Mobile Development', 'Financial Modeling', 'Partnerships', 'Paid Ads', 'SEO',
  'Manufacturing', 'Logistics', 'Go-to-market',
];

const DREAMER_TITLES = [
  'Building the {ind} platform MENA actually needs',
  'From napkin sketch to first prototype: our {ind} journey',
  'Why I quit my job to go all-in on {ind}',
  'Raising pre-seed to bring {ind} to 10M users',
  'The {ind} product I wish existed — so I am building it',
  'Reimagining {ind} for the next billion users',
  'Our {ind} MVP is live — here is the vision',
  'Day one of building something that matters in {ind}',
];
const DREAMER_DESC = [
  'Three months of nights and weekends. The vision is bigger than the fear. Looking for a technical cofounder and early believers.',
  'We sketched this in a Casablanca cafe. Today it is a clickable prototype. Next stop: 100 design partners.',
  'Everyone said the market was too small. We think they are measuring the wrong market.',
  'Bootstrapped, scrappy and obsessed. If you have felt this pain, we want to talk to you.',
  'Not chasing a trend — chasing a problem we have lived for years. Building in public from here on.',
  'The first version is ugly and we are proud of it. Shipping beats perfect every single time.',
];
const REALITY_TITLES = [
  '30 days post-launch — the real numbers',
  '{ind} traction update: the data is in',
  'Q1 results: growth, churn and hard lessons',
  'Our first real revenue — the honest breakdown',
  'Profitability update: where we actually stand',
  'From zero to our first cohort — what worked',
  'The month everything almost broke (and the metrics)',
];
const REALITY_DESC = [
  'Revenue is up but CAC crept higher than we wanted. Here is exactly what we changed.',
  'Churn dropped after we rebuilt onboarding. Retention is the only metric that compounds.',
  'We were wrong about pricing. Raising it actually increased conversions. Counterintuitive but real.',
  'Slower than we hoped, faster than last quarter. Compounding is quiet but relentless.',
  'Two channels worked, four did not. Killing the losers freed the runway that saved us.',
  'Hard month. We cut burn 40%, kept the team, and still grew. Discipline over hype.',
];
const METRICS: { label: string; unit?: string }[] = [
  { label: 'Monthly Revenue', unit: 'USD' },
  { label: 'Active Users' },
  { label: 'MRR', unit: 'USD' },
  { label: 'Paying Customers' },
  { label: 'GMV', unit: 'USD' },
  { label: 'App Downloads' },
  { label: '90-day Retention', unit: '%' },
];
const TAGS = [
  '#fundraising', '#mvp', '#growth', '#bootstrapped', '#mena', '#traction', '#buildinpublic',
  '#founderlife', '#productmarketfit', '#earlystage', '#revenue', '#cofounder',
];

const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const pickN = <T>(a: T[], n: number): T[] => {
  const c = [...a];
  const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  return out;
};
const fmt = (n: number) => n.toLocaleString('en-US');

type Tier = 'high' | 'mid' | 'low';
const tierFor = (): Tier => {
  const r = Math.random();
  return r < 0.25 ? 'high' : r < 0.7 ? 'mid' : 'low';
};

const main = async () => {
  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing from .env');
  const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('connected.');

  await client.query('begin');
  try {
    const del = await client.query(
      `delete from auth.users where email like '%@' || $1`,
      [EMAIL_DOMAIN],
    );
    console.log(`cleared ${del.rowCount ?? 0} prior demo users (profiles + posts cascade).`);

    let postCount = 0;
    let realityCount = 0;

    for (let i = 0; i < 50; i++) {
      const first = FIRST[i];
      const last = LAST[i % LAST.length];
      const name = `${first} ${last}`;
      const username = `@${first}${last.replace(/[^a-zA-Z]/g, '')}`.toLowerCase();
      const avatar = (first[0] + last.replace(/[^a-zA-Z]/g, '')[0]).toUpperCase();
      const email = `${first}.${i}@${EMAIL_DOMAIN}`.toLowerCase();
      const industry = INDUSTRIES[i % INDUSTRIES.length];
      // 6 investors, 44 dreamers.
      const role = i % 8 === 3 ? 'investor' : 'dreamer';

      const ins = await client.query<{ id: string }>(
        `insert into auth.users (
           instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
           confirmation_token, recovery_token, email_change_token_new, email_change
         ) values (
           '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
           'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')), now(),
           '{"provider":"email","providers":["email"]}'::jsonb, $3::jsonb,
           now() - ($4 || ' days')::interval, now(), '', '', '', ''
         ) returning id`,
        [email, PASSWORD, JSON.stringify({ name, username, avatar }), rnd(5, 120)],
      );
      const id = ins.rows[0].id;

      const momentum = rnd(34, 98);
      const verification =
        momentum > 88 ? pick(['verified', 'elite']) : momentum > 66 ? pick(['basic', 'verified']) : pick(['none', 'basic']);
      const isFounder = role === 'dreamer';
      const company = isFounder ? `${pick(['Nova', 'Atlas', 'Kite', 'Orbit', 'Cedar', 'Lumen', 'Pulse', 'Sahara', 'Vela', 'Terra'])} ${pick(['Labs', 'Systems', 'AI', 'Collective', 'Studio', ''])}`.trim() : null;
      const headline = isFounder
        ? `Founder & CEO · ${company} · ${industry}`
        : `Angel Investor · ${industry} & beyond`;
      const bio = isFounder
        ? pick([
            `Building in ${industry}. ${pick(['Second-time founder.', 'Ex-operator.', 'Engineer turned founder.', 'Designer at heart.'])} Obsessed with the customer.`,
            `On a mission to fix ${industry.toLowerCase()} for emerging markets. Building in public.`,
            `${industry} founder. Small team, big ambition, real customers.`,
          ])
        : `Backing relentless founders across ${industry} and adjacent markets. Early checks, hands-on.`;

      const openToSynergy = isFounder && Math.random() < 0.62;
      const strengths = openToSynergy ? pickN(SKILLS, rnd(3, 5)) : [];
      const bottlenecks = openToSynergy ? pickN(SKILLS, rnd(2, 3)) : [];

      await client.query(
        `update profiles set
           role = $2, bio = $3, industry = $4, momentum_score = $5, verification_level = $6,
           followers = $7, following = $8, headline = $9, location = $10,
           company_name = $11, sector = $12,
           strengths = $13, bottlenecks = $14, open_to_synergy = $15,
           synergy_hours_per_week = $16, synergy_equity_expectation = $17
         where id = $1`,
        [
          id, role, bio, industry, momentum, verification,
          rnd(12, 4200), rnd(20, 700), headline, pick(CITIES),
          company, isFounder ? industry : null,
          strengths, bottlenecks, openToSynergy,
          openToSynergy ? rnd(5, 30) : null,
          openToSynergy ? pick(['50/50, negotiable', '60/40 founder split', 'Open to discuss', 'Equity for execution']) : null,
        ],
      );

      // Investors rarely post showcases; founders post 2-4.
      const nPosts = isFounder ? rnd(2, 4) : (Math.random() < 0.3 ? 1 : 0);
      for (let p = 0; p < nPosts; p++) {
        const isReality = Math.random() < 0.5;
        const tier = tierFor();
        const mult = tier === 'high' ? 1 : tier === 'mid' ? 0.42 : 0.13;
        const pMomentum = tier === 'high' ? rnd(80, 99) : tier === 'mid' ? rnd(55, 79) : rnd(30, 54);
        const likes = Math.round(rnd(8, 240) * mult);
        const signals = Math.round(rnd(2, 70) * mult);
        const comments = Math.round(rnd(0, 32) * mult);
        const ageDays = Math.random() < 0.4 ? rnd(0, 3) : rnd(3, 40);
        const tags = pickN(TAGS, rnd(2, 3));

        let title: string;
        let desc: string;
        let metricLabel: string | null = null;
        let metricValue: string | null = null;
        let metricUnit: string | null = null;
        let goalAmt: number | null = null;
        let curAmt: number | null = null;

        if (isReality) {
          realityCount++;
          title = pick(REALITY_TITLES).replace('{ind}', industry);
          desc = pick(REALITY_DESC);
          const m = pick(METRICS);
          metricLabel = m.label;
          metricUnit = m.unit ?? null;
          if (m.unit === '%') metricValue = String(rnd(40, 96));
          else metricValue = fmt(Math.round(rnd(200, 90000) * (mult + 0.15)));
          if (Math.random() < 0.5) {
            goalAmt = rnd(20, 500) * 1000;
            curAmt = Math.round(goalAmt * (tier === 'high' ? 0.7 : tier === 'mid' ? 0.32 : 0.08));
          }
        } else {
          title = pick(DREAMER_TITLES).replace('{ind}', industry);
          desc = pick(DREAMER_DESC);
          goalAmt = rnd(15, 750) * 1000;
          curAmt = Math.round(goalAmt * (tier === 'high' ? 0.55 : tier === 'mid' ? 0.18 : 0.03));
        }

        await client.query(
          `insert into posts (
             user_id, type, milestone_title, description, tags, industry, media_type,
             metric_label, metric_value, metric_unit, momentum_score, likes, signals,
             comments_count, risk_score, reward_score,
             funding_goal_amount, funding_goal_currency, current_funding_amount,
             current_funding_currency, created_at, updated_at
           ) values (
             $1,$2,$3,$4,$5,$6,'metric',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
             now() - ($20 || ' days')::interval, now() - ($20 || ' days')::interval
           )`,
          [
            id, isReality ? 'reality' : 'dreamer', title, desc, tags, industry,
            metricLabel, metricValue, metricUnit, pMomentum, likes, signals, comments,
            rnd(1, 9), rnd(3, 10),
            goalAmt, goalAmt ? 'USD' : null, curAmt, curAmt ? 'USD' : null, ageDays,
          ],
        );
        postCount++;
      }

      if ((i + 1) % 10 === 0) console.log(`  seeded ${i + 1}/50 accounts...`);
    }

    // Reality posts from non-admin authors are auto-set to 'pending' by the
    // Phase 30 trigger — approve them so the demo feed is fully visible.
    const appr = await client.query(
      `update posts set status = 'approved', moderated_at = now()
       where type = 'reality' and status = 'pending'`,
    );

    await client.query('commit');
    console.log(
      `\ndone. 50 accounts · ${postCount} posts (${realityCount} reality, ${appr.rowCount ?? 0} approved).`,
    );
    console.log(`demo login password for every account: ${PASSWORD}`);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    await client.end();
  }
};

main().catch((e) => {
  console.error('seed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
