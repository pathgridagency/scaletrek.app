# ScaleTrek — Progress

Android-first, Expo SDK 54 / React Native 0.81, TypeScript, Supabase backend (project `yhezvbyngzimzmoyhtjl`), Zustand state, React Navigation v7, end-to-end encrypted deal chat via tweetnacl.

---

## Phase 1 — Environment & Linking

**Files**
- `.env` — `EXPO_PUBLIC_SUPABASE_URL` + publishable key (`sb_publishable_*`) populated. Server-only `DATABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` placeholders for migration scripts.
- `.env.example` mirrors the same shape.
- `.gitignore` — `.env` and `.env.*` ignored (`.env.example` whitelisted). Was previously leaking.
- `src/config/env.ts` — exports `SUPABASE_PROJECT_URL` constant; `env.supabaseUrl` falls back to it so the client points at the live project even without `.env`.
- `src/lib/supabase.ts` — `createClient` with a **chunked SecureStore adapter** (`secureStorage`) so refresh tokens survive Android's 2048-byte cap. Namespaced under `storageKey: 'scaletrek.auth'`. Web falls back to AsyncStorage. Stub Proxy for unconfigured-key case.

---

## Phase 2 — Row-Level Security

**File:** `supabase/policies.sql` (~270 lines, idempotent).

| Surface | Read | Write |
|---|---|---|
| `profiles` | authenticated, all rows | self-only insert/update/delete; admin all |
| `posts` | authenticated, non-removed (+ own removed) | owner insert/update/delete; admin all |
| `threads` / `messages` | participants only | messages additionally require `sender_id = auth.uid()` |
| `deals` | participants only (investor or dreamer) | same gate |
| `notifications` | recipient + admin | recipient self-update; admin insert |
| `reports`, `verification_requests` | self + admin | self insert; admin decide |
| Engagement (likes, signals, bookmarks, comments, follows) | scoped per spec | self writes |
| Reference (`currencies`, `fx_rates`, `feature_flags`) | authenticated read | admin write |
| `audit_log` | admin only | admin only |
| Storage buckets | `post-images`/`avatars` public read; `verification` owner+admin read | owner-only delete |

`is_admin()` rewritten as `security definer` with `search_path = public`, excludes suspended admins.

---

## Phase 3 — Showcase + Investor + Momentum

### Showcase
- `src/components/showcase/MetricTicker.tsx` — 900ms cubic ease-out count-up; preserves prefix/suffix/decimals (`"$1.2M"`, `"12,500"`, `"98%"`); optional `verified` badge for `verified`/`elite` authors; delta arrow with weekly trend.
- `src/components/showcase/MilestoneCard.tsx` — `expo-image` hero with gradient scrim, type pill (DREAMER / REALITY CHECK), author row, embedded `MetricTicker`, funding bar, tag chips, like/comment/signal actions.

### Investor
- `src/components/investor/InvestorControlPanel.tsx` — wraps risk/reward sliders + Dreamer/Reality segmented toggle, bound directly to `useFeedStore`. Live "N matching" counts per side. Replaces inline sliders in `InvestorScreen`. `InvestorScreen` deal list now filters by `activeFeed` too.

### Momentum engine
- `src/lib/momentum.ts`:
  - `computeMomentumForUser(user, posts, now)` — pure, returns 0–100 from avg post momentum (×0.55) + recency lift (≤+18) + frequency (≤+14) + engagement (≤+8) + verification boost (+0/+4/+8/+12). Recency decay `e^(-age/3d)`. Stale users floor at 35 + boost.
  - `recomputeMomentum()` — bulk recompute, only writes when scores change.
  - `useMomentumScheduler()` — initial 400ms pass, hydration-flip pass, post-change debounced re-run, 60s heartbeat.
- `MomentumPill` — high-momentum (≥85) users get a pulsing dot animation.
- `useAuthStore.applyMomentumScores` — bulk action that skips no-op rows and mirrors the current user.

---

## Phase 4 — Encrypted Deal Handshake

- `src/lib/crypto.ts`:
  - Curve25519 keypair via `nacl.box.keyPair()`; secret + public stored in `expo-secure-store`, cached in module memory.
  - `ensureKeyPair()` — idempotent, dedup'd async bootstrap.
  - `deriveSharedSecret(peerPub)` — `nacl.box.before(...)` ECDH; cached per peer.
  - `encryptWithSharedSecret` / `decryptWithSharedSecret` — XSalsa20-Poly1305, base64 in/out, random 24-byte nonces.
  - `useCryptoBootstrap()` — root hook; mirrors public key into `user.publicKey` → syncs to `profiles.public_key`.
- `User.publicKey` and `ChatMessage.nonce` added to match `profiles.public_key` / `messages.nonce`.
- `useChatStore`:
  - `encryption` map keyed by thread (peer pubkey + shared secret + activation timestamp). **Not persisted** (`partialize` strips it).
  - `setDealStage('negotiating')` auto-fires `handshake(threadId)`.
  - `sendMessage` encrypts the body if a handshake exists, stores `{ content: ciphertext, nonce, encrypted: true }`.
  - `markRead` re-derives the shared secret on app-restart (peer pubkey lives on the peer's profile; our secret in SecureStore).
  - `decryptMessage` helper for the screen layer.
- `ChatScreen` decrypts on render; lock badge flips muted "E2E" → green "E2E ON" when the handshake completes.

---

## Phase 5 — Verification Audit

Findings + fixes:

| # | Severity | Where | Fix |
|---|---|---|---|
| 1 | Functional | `Navigator` | Hydration gate only waited on 2 of 7 persisted stores. Extended to all (`auth`, `notifications`, `feed`, `chat`, `deals`, `follows`, `moderation`). |
| 2 | **Bug** | `InvestorScreen` | Follow button stuck after click — `isFollowing` selector returned stable fn ref. Replaced with subscription to `edges`. |
| 3 | **Bug** | `UserProfileScreen` | Same root cause. Same fix. |
| 4 | **Bug** | `NotificationsScreen` | New notifications didn't appear — `forUser` selector stable, `items` not subscribed. Switched to `items` subscription + inline filter. |
| 5 | Perf | `FeedScreen` | Whole-store destructure. Split into narrow selectors; `filteredFor` wrapped in `useMemo` with explicit deps. |
| 6 | Perf | `DealPipelineScreen` | Whole-store destructure split. |
| 7 | Perf | `AdminScreen` | Whole-store destructure split. |
| 8 | Perf | `Navigator` | Whole-store auth destructure split into 5 narrow selectors. |

All 17 screens audited for store hookups — no other broken connections.

---

## Phase 6 — Supabase migration (sync layer)

The app is now fully wired to the live Supabase project. Seed mock data is no longer used for initial state; stores hydrate from Supabase on auth.

### Sync modules (`src/lib/sync/`)
| File | Responsibility |
|---|---|
| `auth.ts` | `signInWithPassword`, `signUpWithPassword`, `signOut`, current-user id helpers. Maps `profiles` row to `User` after auth. |
| `profiles.ts` | Profile fetch (single + bulk), update, bulk-momentum push (RLS-limited to self). |
| `posts.ts` | Reads from `post_feed` view; insert, set-removed, like/signal toggle (against `post_likes` / `post_signals`); engagement fetch for own user. |
| `follows.ts` | Edges fetch, insert, delete. |
| `chats.ts` | Threads + messages fetch for current user, `ensureThread` upsert, `insertMessage` with ciphertext, `markThreadRead` per-message `read_by` append, `updateThreadDealStage`. |
| `deals.ts` | Fetch, insert, stage change, patch, delete. Money strings parsed into amount + currency. |
| `notifications.ts` | Fetch (joined to actor profile), insert, mark all read. |
| `moderation.ts` | Reports + verification requests CRUD. |
| `index.ts` | **`useSupabaseSync()`** — root hook. Subscribes to `supabase.auth.onAuthStateChange`. On sign-in: fetches the current user's profile, then hydrates `profiles`, `posts`, `follows`, `threads`, `deals`, `notifications`, `reports`, `verification_requests`, and the current user's engagement (`post_likes`/`post_signals`) in parallel. On sign-out: zeroes every store. |

### Store changes
Every Zustand store dropped its `SEED_*` initial data and is now empty until Supabase hydrates. Mutating actions are **optimistic + sync**: local state updates immediately, then the sync function fires; on error the optimistic write is reverted (where applicable).

| Store | Async actions | Sync calls |
|---|---|---|
| `useAuthStore` | `login`, `signup`, `logout` | `supabase.auth.*`, `updateProfile` for self mutations + role + momentum |
| `useFeedStore` | `createPost` | `posts` table CRUD; like/signal toggles write to `post_likes`/`post_signals`; remove/restore flips `removed` |
| `useChatStore` | `startThread`, `sendMessage` | `ensureThread`, `insertMessage` (with ciphertext + nonce), `updateThreadDealStage`, `markThreadRead`. Pushes own `public_key` to `profiles` when negotiating starts. |
| `useDealsStore` | `add` | `deals` table CRUD |
| `useFollowsStore` | (sync wrappers) | `follows` insert/delete |
| `useNotificationsStore` | (sync wrappers) | `insertNotification`, `markNotificationsRead` |
| `useModerationStore` | (sync wrappers) | `reports` + `verification_requests` |

### App.tsx
`<BackgroundRunners />` mounts three root hooks in order:
1. `useSupabaseSync` — auth listener + hydration.
2. `useCryptoBootstrap` — local keypair + profile pubkey upload.
3. `useMomentumScheduler` — 60s heartbeat for momentum recompute.

### Auth flow now in effect
- **Sign up:** Supabase `auth.signUp` with `data: { name, username, avatar }`. The `handle_new_user` trigger creates a base `profiles` row; the client follows up with a single `update` to set `role`, `bio`, `industry`.
- **Sign in:** `signInWithPassword` → fetch profile → `useAuthStore` populated.
- **Session restore:** `supabase.auth.getSession()` on mount. If a JWT exists in SecureStore, the user is auto-signed-in.
- **Sign out:** clears local state + zeroes every store + revokes the refresh token.

### Encryption + Supabase
Messages travel as `{ ciphertext, nonce, encrypted: true }`. Decryption keys never leave the device. The peer's public key is fetched from `profiles.public_key`; the local secret stays in SecureStore. Shared secrets are kept only in memory.

---

## Pending / known limitations

- **Realtime subscriptions** — current hydration is on-auth + on-open. Live updates (other users posting in real time, new messages arriving while a thread is open) would need `supabase.channel(...).on('postgres_changes', ...)` wiring per store. Not blocking for the demo.
- **Demo accounts** — `admin@scaletrek.app` / `karim@scaletrek.app` / `nour@scaletrek.app` only work if `supabase/demo-users.ts` is run with the service-role key. Fresh testers should sign up from scratch.
- **Image uploads** — `CreatePostScreen` accepts metric/funding/tags but not yet image uploads to the `post-images` bucket; field plumbing is there (`mediaUrl`/`mediaType`) when the picker is wired in.
- **Cross-user momentum push** — RLS only allows users to update their own profile row, so the momentum recompute pushes only the current user's score to Supabase. Other users' scores recompute when they open the app.
- **Onboarding screen** — wired to `onboarded: false` after signup; setting it doesn't yet persist to a backend column, so a wipe-and-reinstall restarts onboarding for that user.

---

## Phase 14 — Post media (photos + videos)

- New table `post_media` (idempotent, RLS: owner write, public read via post visibility) + `post-media` storage bucket. SQL: `supabase/phase14_media.sql`.
- `post_feed` view now ships a `media` jsonb column so the client gets ordered media items in the same round-trip.
- `src/lib/sync/media.ts` — `uploadPostMedia` (Supabase storage upload + public-URL hand-back) and `insertPostMediaRows`.
- `CreatePostScreen` — new picker UI with tier-aware caps (free: 1 image, Pro: up to 6 items incl. video, ≤100 MB each). Uses `expo-image-picker` + `expo-image`.
- `src/components/feed/MediaCarousel.tsx` — paginated horizontal carousel for posts; videos use `expo-video` (new dep) with a tap-to-play overlay.
- `expo-video` plugin added to `app.config.ts`; Android `READ_MEDIA_VIDEO` permission added.

## Phase 15 — Public feed polish (Explore + sort)

- `useFeedStore` gained `feedView: 'explore' | 'dreamer' | 'reality'` + `sortMode: 'recent' | 'top'` + `feedItems()` selector. `activeFeed` still drives the Investor screen for back-compat.
- `FeedScreen` now renders a 3-tab strip (Explore | Dreamer | Reality Check) and a Recent/Top pill above the list. Top sort = `momentum + signals*3 + likes*0.5`.

## Phase 16 — Persist `onboarded` flag

- `profiles.onboarded boolean` (default false, existing rows backfilled to true). SQL: `supabase/phase16_onboarded.sql`. View `public_profiles` exposes it.
- `useAuthStore.setOnboarded` now writes to the profile row; cold-start hydration trusts `profile.onboarded`. Navigator's `OnboardingScreen.onFinish` calls the persisting setter.

## Phase 17 — Realtime subscriptions

- `src/lib/sync/realtime.ts` — opens `supabase.channel(...)` channels for posts (+ likes, signals, post_media), threads/messages, notifications, deals, follows, and subscriptions. Each fires a debounced (400 ms) refetch into the right store using existing fetch helpers. Channels are torn down on user change/logout.
- Mounted from `useSupabaseSync` immediately after initial hydration so we never miss a row inserted in the gap.
- `supabase/phase17_realtime.sql` adds the relevant tables to `supabase_realtime` publication (idempotent, swallows duplicates).

## Phase 18 — ScaleTrek Pro subscription

- `subscriptions` table (one row per user, default tier=free) + `is_pro(uid)` SQL helper + service-role-only writes via webhook + `subscriptions` added to realtime publication. SQL: `supabase/phase18_subscriptions.sql`. `public_profiles` view exposes `is_pro` for badge rendering anywhere a user is shown.
- `supabase/functions/stripe-checkout` — Edge Function creating Stripe Checkout sessions for monthly / yearly plans. Requires caller JWT; reuses an existing Stripe customer if known.
- `supabase/functions/stripe-webhook` — Edge Function verifying Stripe signatures (HMAC-SHA256 against `STRIPE_WEBHOOK_SECRET`) and upserting subscription state on `checkout.session.completed` + `customer.subscription.{created,updated,deleted}`.
- `useSubscriptionStore` (Zustand) — `tier`, `status`, derived `isPro`; hydrated by `fetchMySubscription` in `useSupabaseSync` and live-updated via realtime channel.
- `SubscriptionScreen` — paywall (monthly $9.99 / yearly $79) + "active" management view. Opens Stripe Checkout in `expo-web-browser`; deep links `scaletrek://billing-success` / `billing-cancel` close the browser and force a subscription refetch via `useOAuthDeepLink`.
- Pro perks gated so far: video uploads + ≥2 media per post (CreatePostScreen). Pro badge renders on `ProfileScreen` when `user.isPro`. Other Pro entitlements (DM-anyone, reveal cap, deck max-size) are next-step hooks against `useSubscriptionStore.isPro`.
- Settings → Subscription entry surfaces upgrade / manage.

## Phase 19 — Payments deferred (Stripe unavailable in MA)

Stripe doesn't operate in Morocco, so the Pro paywall is in "register interest"
mode until a region-friendly gateway is wired in. Everything around it stays
intact and the swap is a one-screen change.

- `supabase/phase19_pro_interest.sql` — `pro_interest` table (user_id pk + plan
  + notes + RLS to self/admin). Applied to the live DB.
- `src/lib/sync/subscriptions.ts` — added `registerProInterest` /
  `fetchMyProInterest`. `startStripeCheckout` is kept in place for the day a
  Stripe-equivalent gateway is wired in.
- `src/screens/SubscriptionScreen.tsx` — paywall replaced with a "Coming soon"
  notice + plan picker that records intent into `pro_interest`. The button text
  becomes "You're on the list" once registered.
- Stripe Edge Functions (`stripe-checkout`, `stripe-webhook`) are left in the
  tree as scaffolding for a future provider swap. They are inert without
  `STRIPE_SECRET_KEY` set in the function env.
- Admins can flip a beta tester to Pro manually by updating
  `subscriptions` (tier=pro, status=active) via the dashboard; the realtime
  channel pushes the flip to the client immediately.

### Outstanding deploy work (build artifacts only)

1. **Deploy `send-push` Edge Function** — after `supabase login`, from
   `C:\Users\Admin\Documents\scaletrek`:
   - `supabase functions deploy send-push`
2. **Release APK** — already rebuilt at
   `android/app/build/outputs/apk/release/app-{universal,arm64-v8a,...}-release.apk`
   on 2026-05-18 with phases 14-19 in the bundle and `expo-video` linked. Reinstall to test.

## Phase 20 — Bottom safe-area fix

- `Tabs` in `Navigator.tsx` now reads `useSafeAreaInsets()` and applies `bottomPad = max(insets.bottom, 8)` to the tabBar so phones with 3-button nav / gesture pill no longer hide the bottom icons under the system nav.

## Phase 21 — Localization (i18n) — EN / FR / AR / ES

- `src/i18n/index.ts` — `i18n-js` instance + Zustand store (persisted under `@scaletrek/locale`). Auto-detects device locale on first launch via `expo-localization.getLocales()`.
- `src/i18n/locales/{en,fr,ar,es}.ts` — full translation dictionaries (nav, feed, common, auth, profile, settings, subscription, create).
- `useTranslation()` hook returns `{ locale, isRTL, t }`; `t()` re-binds the active locale per call so it picks up changes without a remount.
- Language picker in `SettingsScreen` (under "Language" / "اللغة" / etc.) — switches instantly.
- Translated screens: `Navigator` tab labels, `FeedScreen` (tabs + sort + empty + hints), `SettingsScreen` (every label + alert), `SubscriptionScreen` (full), `ProfileScreen` (title + Edit profile).
- Other screens still mostly English — wire `useTranslation` + `t('…')` calls per surface as you go; the dictionaries are already populated.
- Arabic (`ar`) renders correctly inside `Text` (RN handles bidi), but the global layout is not RTL-mirrored. Forcing `I18nManager.forceRTL(true)` on locale select is a follow-up — it needs an app restart and isn't wired here.

## Phase 22 — Profile extensions (avatar, cover, socials, business)

- `supabase/phase22_profile_extras.sql` — adds columns `avatar_url`, `cover_url`, `headline`, `location`, `website`, `linkedin_url`, `twitter_url`, `instagram_url`, `github_url`, `facebook_url`, `company_name`, `sector`, `founded_year`, `team_size` on `profiles`. Adds `profile-covers` storage bucket (public read; owner-only insert into `profile-covers/<uid>/`). Tightens the existing `avatars` bucket policies (was permissive `rw`; now strict owner-only insert/manage). Rebuilds `public_profiles` to surface all new columns + mask them when investor identity is hidden.
- `src/lib/sync/profilePhotos.ts` — `uploadProfilePhoto(bucket, uri)` returns a public URL; used by `EditProfileScreen`.
- `src/data/mockData.ts` (User type) + `src/lib/sync/profiles.ts` + `src/store/useAuthStore.ts` PERSISTED_KEYS — all extended fields plumbed end-to-end.
- `EditProfileScreen` — full rewrite with cover-photo picker, avatar-photo picker (falls back to initials), Personal/Business toggle, business fields, and a Socials section (LinkedIn / X / Instagram / GitHub / Facebook).
- `ProfileScreen` + `UserProfileScreen` — render cover photo header, profile photo, headline, location, website (tap to open), company line, and clickable social pills. Investor privacy gating still applies on UserProfile.
- `Avatar` component now accepts optional `imageUrl` and renders the image when present; otherwise falls back to the initials circle.

## Phase 23 — Design system overhaul (premium look)

- `src/constants/theme.ts` — full refresh. New dark-first palette (deep `#09090B` background, electric indigo accent `#818CF8`, sophisticated golds for Elite), gradients per tier, expanded spacing/radii/typography scales, motion tokens, `elevationFor()` helper for shadow elevation.
- `src/components/ui/Button.tsx` — rewritten with `Animated.spring` press scaling, `gradient` and `outline` variants, `xl` size, optional elevated shadow, `fullWidth` and `iconRight` props.
- `src/components/ui/GlassCard.tsx` — adds elevation prop (none/sm/md/lg/xl) and optional `blur` (real `BlurView`), per-tier accents (pro, elite).
- `src/components/ui/TextField.tsx` — focused state with accent border + label color, leading/trailing icon slots.
- `src/components/ui/Avatar.tsx` — adds `ring` (story / live / verified) drawn with `LinearGradient`, presence dot, pro/elite accents.
- New primitives: `Badge.tsx` (pro/elite/verified/beta/new), `Sheet.tsx` (animated bottom sheet), `Skeleton.tsx` (shimmer), `EmptyState.tsx`, `IconButton.tsx`, `SectionHeader.tsx`, `Checkbox.tsx`.
- Navigator tab bar: removed top border, added `elevationFor 'lg'`, bigger icons (22 vs 20), tighter letter-spacing on labels.
- FeedScreen header: bigger gradient-ready logo (`ScaleTrek`), `IconButton` circles for search/notifications.

## Phase 24 — Stories (24h ephemeral)

- `supabase/phase24_stories.sql` — `stories` table (user_id, url, type, expires_at default `now() + 24h`), `story_views` table, public `stories` storage bucket, `story_feed` view with `security_invoker = true` so `auth.uid()` works in `seen_by_me`. Adds tables to `supabase_realtime` publication. Includes `purge_expired_stories()` SECURITY DEFINER function for the cron Edge Function.
- `supabase/functions/purge-stories/index.ts` — Edge Function: deletes expired rows + their storage objects. Schedule hourly: `0 * * * *`.
- `src/lib/sync/stories.ts` — `fetchStories`, `createStory` (upload + insert), `markStorySeen`, `deleteStory`, `groupStoriesByAuthor` (sorts unseen-first, newest-author-first).
- `src/store/useStoriesStore.ts` — Zustand store with `upsertOne`, `markSeenLocal`, `groupedByAuthor()`.
- `src/components/stories/StoriesRail.tsx` — horizontal scroller at top of feed: "Your story" first with `+` overlay if none, then others with gradient story rings (pink → purple) that go grey when all stories seen.
- `src/screens/StoryComposerScreen.tsx` — full-screen camera-first composer (auto-opens picker, supports gallery + camera, photo or 15s video, optional caption overlay with toggle).
- `src/screens/StoryViewerScreen.tsx` — full-screen viewer with per-story progress bars at top, left/right tap zones, long-press to pause, view counter for owner, delete-mine button.
- Wired into hydration (`src/lib/sync/index.ts`) and realtime channel (`src/lib/sync/realtime.ts`).
- `FeedScreen` ListHeaderComponent now renders the rail.

## Phase 25 — 3-tier subscriptions (Free / Pro / Elite, monthly + yearly)

- `supabase/phase25_tiers.sql` — extends `subscription_tier` enum with `'elite'`; adds `subscription_interval` enum + `subscriptions.interval` column; redefines `is_pro()` to cover **both** pro and elite (umbrella entitlement); adds `is_elite()`; extends `pro_interest` with `tier`; rebuilds `public_profiles` to expose `is_elite`.
- `src/store/useSubscriptionStore.ts` — `tier: 'free' | 'pro' | 'elite'`, `interval`, `isPro` (true for pro OR elite active), `isElite` (elite-only).
- `src/lib/sync/subscriptions.ts` — `startStripeCheckout(tier, interval)`, `registerProInterest(tier, interval, notes)`, `fetchMyProInterest()` returns `{ tier, interval, ... }`.
- `src/screens/SubscriptionScreen.tsx` — full rewrite. Hero, monthly/yearly toggle pill with "SAVE 30%" tag on yearly, three tier cards (Starter free, Pro $9.99/mo or $79/yr with "MOST POPULAR" badge, Elite $24.99/mo or $199/yr with crown). Tap a card to select, primary gradient CTA below switches accordingly. "Register interest" mode kept since Stripe still bypassed.

## Phase 26 — Privacy Policy + Terms of Service

- `supabase/phase26_legal.sql` — `legal_acceptances` table (user_id, document, version, accepted_at) keyed on (user_id, document), self-only RLS.
- `src/constants/legal.ts` — full long-form Privacy + Terms content, `PRIVACY_VERSION` / `TERMS_VERSION` constants.
- `src/screens/LegalScreen.tsx` — single reusable screen rendering either kind with a tiny markdown renderer (h1, h2, lists, **bold**).
- `src/lib/sync/legal.ts` — `recordBothAcceptances`, `fetchMyAcceptances`.
- `src/screens/Auth/SignupScreen.tsx` — added `Checkbox` requiring acceptance before account creation; embedded tappable links to open Privacy/Terms over the auth flow via `AuthGate`.
- `src/screens/Auth/AuthGate.tsx` — owns a `legal` overlay state that renders `LegalScreen` over the auth screens.
- `SettingsScreen` — new "Legal" section with rows for Privacy Policy + Terms of Service.
- Navigator routes: `PrivacyPolicy`, `TermsOfService`.

## Phase 27 — Premium feature picks

- `supabase/phase27_features.sql` — adds `saved_posts` table (Pro), `posts.scheduled_for` column (Elite) + updated `post_feed` view that hides future-scheduled posts from non-authors, `trending_tags` view (last 7d, requires ≥2 distinct authors per tag), `profiles.handle` lowercase unique slug (Pro custom @handle).
- `supabase/functions/pitch-coach/index.ts` — Edge Function that verifies the caller is **Elite-active** server-side via the service role, then calls Claude (`claude-opus-4-7`) with a strict JSON system prompt. Returns `{ score, strengths[], weaknesses[], rewrite, model }`. **Requires `ANTHROPIC_API_KEY`** in Supabase Edge Functions env.
- `src/lib/sync/saved.ts` — `fetchSavedPostIds`, `savePost`, `unsavePost`.
- `src/lib/sync/trending.ts` — `fetchTrendingTags(limit)`.
- `src/lib/sync/pitchCoach.ts` — `critiquePitch(pitch, audience)`.
- `src/lib/sync/handle.ts` — `validateHandle`, `isHandleAvailable`, `setMyHandle`.
- `src/screens/PitchCoachScreen.tsx` — Elite-gated screen: audience selector (investor/customer/cofounder), pitch textarea (20-4000 chars), runs `pitch-coach` Edge Function, renders the big score card + strengths + weaknesses + suggested rewrite. Non-Elite users see `EmptyState` with upgrade CTA.
- `src/screens/SavedPostsScreen.tsx` — Pro-gated list of bookmarked posts rendered via existing `FeedCard`.
- `SearchScreen` — now prefers `trending_tags` view (cross-user popularity) with the local computation as a fallback.
- `SettingsScreen` — new "Features" section linking to Saved + Pitch Coach.
- Navigator routes: `PitchCoach`, `SavedPosts`.

## Phase 28 — Admin safety guardrails

- `supabase/phase28_admin_safety.sql` — a user cannot change their own role (admins must be promoted/demoted by a *different* admin); guards against demoting/suspending the last remaining admin. `AdminScreen` already enforces the matching client-side checks.

## Phase 29 — `profiles_read` recursion fix

- `supabase/phase29_fix_profiles_recursion.sql` — Phase 7 defined `profiles_read` with an inline subquery against `profiles`, causing infinite-recursion errors under RLS. Rewritten to use a `SECURITY DEFINER` helper instead.

## Phase 30 — Reality-Check post moderation

- `supabase/phase30_post_moderation.sql` — `posts.status` enum (`pending` | `approved` | `rejected`) + `moderation_reason` / `moderated_by` / `moderated_at`. A `before insert` trigger sends new **reality** posts from non-admin authors to `pending`; dreamer posts and admin-authored posts publish immediately. `post_feed` view hides non-approved posts from everyone except the author and admins. `approve_post(uuid)` / `reject_post(uuid, text)` SECURITY DEFINER RPCs (admin-only) flip status and notify the author. Idempotent. Wired into `migrate.ts`.
- `src/lib/sync/posts.ts` — `fetchPendingRealityPosts`, `approvePostRemote`, `rejectPostRemote`; `ShowcasePost` carries `status` + `moderationReason`.
- `useFeedStore` — `feedItems()` hides pending/rejected from the public feed; `pendingReality()` selector; `approvePost` / `rejectPost` actions.
- `AdminScreen` — new **Queue** tab: pending reality posts with Approve / Reject (optional reason → notifies author), pull-to-refresh. Admin tab strip relabelled to fit 5 tabs (Stats · Users · Queue · Flags · KYC).
- `FeedCard` — shows a "Pending review" / "Not approved" banner on the author's own non-approved posts (they stay visible to the author on their profile).

## Phase 31 — Swipe-friendly navigation

- `src/components/navigation/SwipeArea.tsx` — `react-native-gesture-handler` Pan wrapper; horizontal flick navigates between bottom tabs. `activeOffsetX` / `failOffsetY` keep vertical FlatList scrolling untouched. No new dependency (gesture-handler was already installed); reanimated absent, so the `onEnd` callback runs on the JS thread.
- `App.tsx` — wrapped in `GestureHandlerRootView` (required for the Pan gesture). **Triggers a native rebuild.**
- `Navigator.tsx` — every bottom-tab screen wrapped in `SwipeArea`; swipe left/right moves to the adjacent tab in role-aware order.
- Horizontal scrollers reachable inside swipe-wrapped tabs (`StoriesRail`, `MediaCarousel`, `InvestorScreen` stats/watchlist, `AdminScreen` filters) now import `ScrollView`/`FlatList` from `react-native-gesture-handler` so the inner scroll cancels the ancestor swipe Pan instead of fighting it.

## Phase 32 — `public_profiles` view repair

- `supabase/phase32_fix_public_profiles.sql` — Phase 25 rebuilt `public_profiles` to add `is_elite` but based the rewrite on a pre-Phase-22 definition, dropping all 14 extended profile columns (`avatar_url`, `cover_url`, `headline`, `location`, `website`, socials, business fields). The app's `fetchProfile` selects those columns, so every login threw `column public_profiles.avatar_url does not exist` (42703). View rebuilt with all columns + `is_elite`. Server-side only — no APK change needed. Idempotent, wired into `migrate.ts`.

## Phase 33 — Story engagement (likes + comments)

- `supabase/phase33_story_engagement.sql` — `story_likes` (composite PK story+user) and `story_comments` (body 1-500 chars) tables with RLS (read = any authed user; insert = self; comment delete = author / story owner / admin). `story_feed` view rebuilt (`security_invoker = true`) with `like_count` / `liked_by_me` / `comment_count`. Both tables added to `supabase_realtime` publication. Idempotent, wired into `migrate.ts`.
- `src/lib/sync/stories.ts` — `toggleStoryLike`, `fetchStoryComments`, `addStoryComment`, `deleteStoryComment`.
- `src/store/useStoriesStore.ts` — `toggleLike` (optimistic) + comment actions.
- `src/screens/StoryViewerScreen.tsx` — like button + count, comment sheet (list + composer), delete-comment for permitted users.

## Deploy steps for testers

1. Apply migrations: `cd C:\Users\Admin\Documents\scaletrek\supabase && npx tsx migrate.ts` (or apply a single phase via `npx tsx apply-phase.ts <file>.sql` — e.g. `phase30_post_moderation.sql`).
2. Deploy Edge Functions:
   - `supabase functions deploy purge-stories` (then schedule hourly cron in the Dashboard: `0 * * * *`).
   - `supabase functions deploy pitch-coach`, and set `ANTHROPIC_API_KEY` in the Dashboard → Edge Functions → secrets (without it, the Pitch Coach button shows an error but the rest of the app works).
3. `cd C:\Users\Admin\Documents\scaletrek`
4. `npx expo start -c` for a local smoke test, then `eas build --profile preview --platform android`.
5. EAS prints a shareable install URL — testers install, sign up fresh (must tick the Privacy + Terms checkbox), and start using the live app.

**Open Pro/Elite payment integration:** the paywall is still in "register interest" mode (Phase 19). When a region-friendly payment gateway is wired, swap `registerProInterest` in `SubscriptionScreen` for the new gateway's checkout call and have the webhook flip `subscriptions.tier` + `subscriptions.interval`.

**Disclaimer:** The Privacy Policy and Terms of Service in `src/constants/legal.ts` are a drafted template, **not legal advice**. Run them past a lawyer in your jurisdiction before public launch.
