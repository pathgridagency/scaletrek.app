import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedStore } from '../store/useFeedStore';
import { ShowcasePost, User, VerificationLevel } from '../data/mockData';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// Active-window weights. The first 24h get the biggest boost; the curve decays
// exponentially after that so a stale account naturally slides toward 50.
const recencyWeight = (ageMs: number): number => {
  if (ageMs <= 0) return 1;
  return Math.exp(-ageMs / (3 * DAY));
};

const verificationBoost: Record<VerificationLevel, number> = {
  none: 0,
  basic: 4,
  verified: 8,
  elite: 12,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const postCreatedAt = (post: ShowcasePost): number => {
  if (typeof post.createdAtMs === 'number') return post.createdAtMs;
  return Date.now() - DAY;
};

export const computeMomentumForUser = (
  user: User,
  userPosts: ShowcasePost[],
  now: number = Date.now(),
): number => {
  const active = userPosts.filter((p) => !p.removed);

  if (active.length === 0) {
    // Decay toward 35 if no activity at all (still has a baseline).
    return clamp(35 + verificationBoost[user.verificationLevel], 0, 100);
  }

  let weightedRecency = 0;
  let weightedPostScore = 0;
  let weightSum = 0;
  let postsLastWeek = 0;
  let mostRecent = 0;

  for (const post of active) {
    const createdAt = postCreatedAt(post);
    const age = Math.max(0, now - createdAt);
    const w = recencyWeight(age);
    weightedRecency += w;
    weightedPostScore += (post.momentumScore ?? 50) * w;
    weightSum += w;
    if (age <= WEEK) postsLastWeek += 1;
    if (createdAt > mostRecent) mostRecent = createdAt;
  }

  const avgPostScore = weightSum > 0 ? weightedPostScore / weightSum : 50;

  // Frequency: 0-1 across "0 to 5+ posts per week".
  const frequency = clamp(postsLastWeek / 5, 0, 1);

  // Recency: 0-1 from "just now" to "older than 7 days".
  const lastAge = Math.max(0, now - mostRecent);
  const recency = clamp(1 - lastAge / WEEK, 0, 1);

  // Engagement signal — likes + signals weighted by recency.
  let engagement = 0;
  for (const post of active) {
    const w = recencyWeight(Math.max(0, now - postCreatedAt(post)));
    engagement += (post.likes * 0.4 + post.signals * 0.8 + post.comments * 0.3) * w;
  }
  const engagementNorm = clamp(engagement / 30, 0, 1);

  // Compose. Avg post score sets the floor (~50), recency/frequency drive the lift.
  const composite =
    avgPostScore * 0.55 +
    recency * 18 +
    frequency * 14 +
    engagementNorm * 8 +
    verificationBoost[user.verificationLevel];

  return Math.round(clamp(composite, 0, 100));
};

const indexPostsByUser = (posts: ShowcasePost[]): Map<string, ShowcasePost[]> => {
  const out = new Map<string, ShowcasePost[]>();
  for (const post of posts) {
    const arr = out.get(post.userId);
    if (arr) arr.push(post);
    else out.set(post.userId, [post]);
  }
  return out;
};

export const recomputeMomentum = (now: number = Date.now()): number => {
  const { users, applyMomentumScores } = useAuthStore.getState();
  const posts = useFeedStore.getState().posts;
  const byUser = indexPostsByUser(posts);

  const updates: Record<string, number> = {};
  let changed = 0;
  for (const user of users) {
    const userPosts = byUser.get(user.id) ?? [];
    const next = computeMomentumForUser(user, userPosts, now);
    if (next !== user.momentumScore) {
      updates[user.id] = next;
      changed += 1;
    }
  }
  if (changed > 0) applyMomentumScores(updates);
  return changed;
};

// Hook: mount this once near the root. Runs an initial pass after hydration,
// re-runs whenever posts change (debounced), and ticks every 60s so decay
// kicks in without requiring user interaction.
export const useMomentumScheduler = (intervalMs: number = 60_000) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      recomputeMomentum();
    }, delay);
  };

  useEffect(() => {
    schedule(400);

    const unsubAuth = useAuthStore.subscribe((state, prev) => {
      if (state._hasHydrated && !prev._hasHydrated) schedule(200);
    });
    const unsubFeed = useFeedStore.subscribe((state, prev) => {
      if (state.posts !== prev.posts) schedule(250);
    });

    const id = setInterval(() => recomputeMomentum(), intervalMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(id);
      unsubAuth();
      unsubFeed();
    };
  }, [intervalMs]);
};
