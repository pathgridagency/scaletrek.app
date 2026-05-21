# ScaleTrek — Feature Overview

*Last updated: 2026-05-20 · App version 1.0.0 · Terms v1.1.0*

ScaleTrek is an Android-first mobile network where **founders ("Dreamers")** showcase
traction and **investors** discover them — built around verified metrics, momentum
scoring, ephemeral stories, and end-to-end encrypted deal conversations.

---

## 1. At a glance

| | |
|---|---|
| **Platform** | Android (Expo SDK 54 / React Native 0.81, TypeScript) |
| **Backend** | Supabase — Postgres, Auth, Storage, Realtime, Edge Functions |
| **Distribution** | Sideloadable APK today; Play Store-ready |
| **Languages** | English · Français · العربية · Español |
| **Account types** | Dreamer · Investor · Admin |
| **Plans** | Starter (free) · Pro · Elite |

---

## 2. Accounts & authentication

- **Email + password sign-up** with name, username, role (Dreamer or Investor), and
  optional bio/industry.
- **Social sign-in** scaffolding for Google, LinkedIn, GitHub, X, Facebook, Apple
  (provider keys configured per deployment).
- **Session persistence** — refresh tokens stored in the device's encrypted
  SecureStore (chunked to survive Android's size cap); users stay signed in across
  restarts.
- **Password reset** — forgot-password and reset-password flows.
- **Sign-up legal gate** — account creation is blocked until the user ticks
  acceptance of the Privacy Policy and Terms of Service.
- **Sign-out** fully clears local state and revokes the refresh token.

## 3. Onboarding

- First-launch **onboarding screens** introduce the app.
- **Complete-profile** step collects the essentials after signup.
- The `onboarded` flag is persisted server-side, so onboarding doesn't repeat
  across devices.

## 4. The Feed

A three-tab feed with sorting:

- **Explore** — everything.
- **Dreamer** — aspirational posts and milestones.
- **Reality Check** — verified, grounded progress updates (moderated; see §17).
- **Sort:** *Recent* or *Top* (Top = momentum + signals×3 + likes×0.5).
- **Stories rail** pinned to the top of the feed (see §6).
- Pull-to-refresh and live updates via realtime subscriptions.

## 5. Showcase, milestones & metrics

- **Milestone cards** — hero image with gradient scrim, type pill
  (Dreamer / Reality Check), author row, funding progress bar, and tag chips.
- **Animated metric ticker** — numbers count up on appearance, preserving
  formats like `$1.2M`, `12,500`, `98%`, with a weekly trend delta arrow.
- **Verified badge** on metrics from verified or Elite authors.
- Per-post actions: **like**, **comment**, **signal** (high-intent interest).

## 6. Stories (24-hour ephemeral)

- **Stories rail** at the top of the feed — gradient rings (pink→purple) that turn
  grey once all of an author's stories are seen; "Your story" slot first.
- **Camera-first composer** — photo or 15-second video, gallery or live camera,
  optional caption overlay.
- **Full-screen viewer** — per-story progress bars, left/right tap navigation,
  long-press to pause, view counter for the owner, delete-your-own.
- Stories **auto-expire after 24h** — a scheduled server job purges expired rows
  and their media every hour.

## 7. Posts & media

- **Create-post** with metric, funding target, and tags.
- **Photos & videos** — tier-aware caps:
  - Starter: 1 image per post.
  - Pro: up to 6 items per post including video, ≤100 MB each.
- **Media carousel** — paginated horizontal gallery; videos play inline with a
  tap-to-play overlay.
- **Scheduled posts** (Elite) — schedule a post for the future; hidden from others
  until its time arrives.

## 8. Search & trending

- **Search** people and content.
- **Trending tags** — cross-user popularity over the last 7 days (a tag must be
  used by at least two different authors to trend).

## 9. Profiles

- **Personal profile** — avatar, cover photo, headline, location, website, bio.
- **Business profile** — company name, sector, founding year, team size.
- **Social links** — LinkedIn, X, Instagram, GitHub, Facebook (tappable pills).
- **Custom @handle** (Pro) — a personalized lowercase username slug.
- **Edit profile** with cover/avatar photo pickers and a Personal/Business toggle.
- **Momentum pill** on profiles; high-momentum users (≥85) get a pulsing indicator.

## 10. Following & social graph

- **Follow / unfollow** any user.
- Follow state is live across the feed, profiles, and the investor screen.

## 11. Momentum engine

A 0–100 score quantifying a founder's traction:

- Built from average post momentum, recency lift, posting frequency, engagement,
  and a verification boost.
- Recency uses exponential decay; inactive users settle to a floor.
- Recomputed on a 60-second heartbeat and after post changes.

## 12. Investor experience

- **Investor control panel** — risk/reward sliders and a Dreamer/Reality toggle,
  with live "N matching" counts per side.
- **Filtered deal discovery** that respects the selected feed.
- **Investor privacy** — investors are hidden from founders by default, shown only
  as "Verified Investor" until they choose to reveal themselves (individually or
  globally). Hidden investors' profile details are masked end-to-end.

## 13. Deals & encrypted chat

- **Deal pipeline** — track deals through stages between an investor and a
  founder.
- **1:1 messaging** scoped to deal participants only.
- **End-to-end encrypted chat** — when a deal enters *negotiating*, an automatic
  cryptographic handshake (Curve25519 ECDH + XSalsa20-Poly1305) kicks in. Messages
  are encrypted on-device; the server only ever stores ciphertext. A lock badge
  flips from grey "E2E" to green "E2E ON" when encryption is live.
- **Deck shares** — share pitch decks, NDA-gated, as a convenience layer for deal
  conversations.

## 14. Verification & KYC

- **Request verification** — users submit verification requests with documents to
  a private, owner-and-admin-only storage bucket.
- Admins review and decide; verified status drives the verified metric badge and a
  momentum boost.

## 15. Notifications

- **In-app notifications** for signals, follows, deals, comments, mentions, and
  system events.
- **Push notifications** via Expo, with **per-channel preferences** — users can
  toggle each notification type in Settings.

## 16. Subscriptions — Starter · Pro · Elite

Three tiers, monthly or yearly:

| | **Starter** | **Pro** | **Elite** |
|---|---|---|---|
| Price | Free | $9.99/mo · $79/yr | $24.99/mo · $199/yr |
| Images per post | 1 | up to 6 (incl. video) | up to 6 (incl. video) |
| Saved posts | — | ✓ | ✓ |
| Custom @handle | — | ✓ | ✓ |
| Scheduled posts | — | — | ✓ |
| AI Pitch Coach | — | — | ✓ |
| Accent | — | indigo | gold + crown |

- **Subscription screen** — hero, monthly/yearly toggle ("SAVE 30%" on yearly),
  three tier cards with a "MOST POPULAR" badge on Pro.
- **Payments status:** the paywall currently runs in **"register interest" mode** —
  Stripe is unavailable in the operating region, so users register intent and an
  admin can activate a tier manually until a region-friendly gateway is wired in.

## 17. Reality-Check moderation

- New **Reality-Check posts from non-admins** enter a **pending** state and are not
  publicly visible until approved.
- Dreamer posts and admin posts publish immediately.
- Authors still see their own pending/rejected posts, with a status banner.
- Admins approve or reject (with an optional reason that notifies the author).

## 18. AI Pitch Coach (Elite)

- Elite members submit a pitch (20–4000 characters) and pick an audience —
  **investor, customer, or cofounder**.
- A server-side AI critique (Claude Opus) returns a **0–100 score**, strengths,
  weaknesses, and a suggested tightened rewrite.
- Entitlement is verified server-side, so the feature can't be spoofed by the
  client.

## 19. Saved posts (Pro)

- Bookmark posts and revisit them in a dedicated **Saved** list.

## 20. Admin tools

A five-tab admin console:

- **Stats** — platform metrics.
- **Users** — manage accounts and roles.
- **Queue** — the Reality-Check moderation queue (approve/reject).
- **Flags** — user reports.
- **KYC** — verification requests.
- **Safety guardrails:** admins cannot change their own role, and the last
  remaining admin cannot be demoted or suspended.

## 21. Localization

- Full UI translations for **English, French, Arabic, Spanish**.
- Device locale auto-detected on first launch; instant in-app language switch.
- Arabic text renders with correct bidirectional handling.

## 22. Navigation & design

- **Premium dark-first design system** — deep `#09090B` background, electric-indigo
  accent, gold for Elite, per-tier gradients, glassmorphism cards, blur, skeleton
  loaders, animated buttons.
- **Swipe navigation** — flick left/right anywhere to move between bottom tabs;
  inner horizontal scrollers (stories, media carousels) are respected.
- Safe-area aware tab bar (no icons hidden behind system nav).

## 23. Legal & privacy

- In-app **Privacy Policy** and **Terms of Service**, version-stamped; users
  re-accept when the substantive content changes.
- **Terms v1.1.0** rebalanced to be fair to both users and the operator —
  content-license ends on deletion, content removal carries notice and appeal
  rights, a 14-day refund window, a liability floor, consumer home-jurisdiction
  protection, and 30-day notice for material changes.
- Accessible from Settings and during sign-up.

## 24. Security & privacy architecture

- **Row-Level Security** on every table — users see and write only what they
  should; admins are scoped and suspended admins are excluded.
- **End-to-end encrypted DMs** — decryption keys never leave the device.
- **Encrypted local storage** for auth tokens and crypto keys.
- **TLS in transit**, hashed passwords (Argon2), least-privilege storage buckets.
- Private buckets for verification documents (owner + admin only).

---

## 25. Current limitations / not yet live

- **Payments** — paywall is in "register interest" mode pending a region-friendly
  gateway; tiers are activated manually by an admin in the meantime.
- **AI Pitch Coach** — deployed, but requires an `ANTHROPIC_API_KEY` to be set in
  the backend before it returns critiques.
- **Social sign-in** — Google and other OAuth providers need their client
  credentials configured before those buttons work; email/password is unaffected.
- **RTL layout** — Arabic text is correct, but the global layout is not yet fully
  mirrored.
- **Cross-user momentum** — other users' momentum scores recompute when they next
  open the app (a row-level security constraint, by design).

## 26. Backend services

- **Database** — Supabase Postgres with full RLS; schema applied through Phase 30.
- **Realtime** — live updates for posts, stories, messages, deals, follows,
  notifications, and subscriptions.
- **Edge Functions** (all deployed and active):
  - `send-push` — delivers push notifications, honoring per-channel preferences.
  - `purge-stories` — hourly cron that deletes expired stories and their media.
  - `pitch-coach` — Elite-gated AI pitch critique.
- **Storage buckets** — post images/media, avatars, profile covers, stories
  (public read); verification documents (private).

---

*This document describes ScaleTrek as built through development Phase 31.
The Privacy Policy and Terms of Service are a drafted template and should be
reviewed by legal counsel before public launch.*
