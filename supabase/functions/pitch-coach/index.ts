// Supabase Edge Function: pitch-coach
// AI-powered pitch critique for ScaleTrek Elite subscribers. The client posts
// their pitch text; this function verifies the caller is Elite, then asks
// Claude to score and critique it.
//
// Deploy:  supabase functions deploy pitch-coach
// Required env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-set in Supabase)
//   ANTHROPIC_API_KEY                         (set this yourself in the Dashboard)
//
// Request body:  { pitch: string, audience?: 'investor' | 'customer' | 'cofounder' }
// Response:      { score: number, strengths: string[], weaknesses: string[],
//                  rewrite: string, model: string }
//
// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const MODEL = 'claude-opus-4-7';
const SYSTEM_PROMPT = `You are a senior venture capitalist evaluating a founder's pitch. Be direct, specific, and constructive. Return ONLY valid JSON of this exact shape:
{
  "score": <0-100 integer>,
  "strengths": [<3 to 5 short bullet strings>],
  "weaknesses": [<3 to 5 short bullet strings>],
  "rewrite": <a tightened version of the pitch in 2-3 sentences>
}
Do not add any prose outside the JSON.`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Verify the caller's identity from the Authorization header.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Identify the user from the JWT, then check entitlement server-side so
  // the client can't fake Elite status.
  const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401 });
  }
  const userId = userRes.user.id;

  const { data: subRow, error: subErr } = await supabase
    .from('subscriptions')
    .select('tier,status,current_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  if (subErr) {
    return new Response(JSON.stringify({ error: subErr.message }), { status: 500 });
  }
  const eliteActive =
    subRow?.tier === 'elite' &&
    (subRow.status === 'active' || subRow.status === 'trialing') &&
    (!subRow.current_period_end || new Date(subRow.current_period_end) > new Date());
  if (!eliteActive) {
    return new Response(JSON.stringify({ error: 'elite required' }), { status: 403 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const pitch = (payload?.pitch ?? '').toString().trim();
  if (pitch.length < 20) {
    return new Response(JSON.stringify({ error: 'pitch too short' }), { status: 400 });
  }
  if (pitch.length > 4000) {
    return new Response(JSON.stringify({ error: 'pitch too long (max 4000 chars)' }), { status: 400 });
  }
  const audience = ['investor', 'customer', 'cofounder'].includes(payload?.audience)
    ? payload.audience
    : 'investor';

  // Call Claude.
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Audience: ${audience}\n\nPitch:\n"""\n${pitch}\n"""`,
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const txt = await claudeRes.text();
    return new Response(
      JSON.stringify({ error: 'model call failed', detail: txt.slice(0, 500) }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = await claudeRes.json();
  const text = body?.content?.[0]?.text ?? '';
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'model returned non-JSON', raw: text.slice(0, 500) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      score: Math.max(0, Math.min(100, parsed.score ?? 0)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 6) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 6) : [],
      rewrite: typeof parsed.rewrite === 'string' ? parsed.rewrite : '',
      model: MODEL,
    }),
    { headers: { 'content-type': 'application/json' } },
  );
});
