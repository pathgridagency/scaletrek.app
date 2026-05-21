# ScaleTrek — Next Session Plan

Planned 2026-05-21. Everything below must be **real and backend-wired — no
mockups, no placeholder UI**. Each item ships DB + sync + store + screen end
to end, applied to the live Supabase project `yhezvbyngzimzmoyhtjl`.

---

## 0. The "circle with a letter" on each post — explained

It is the **`RealityBadge`** rendered top-right of every `FeedCard`
(`src/components/feed/FeedCard.tsx` line 105), showing the author's
**identity-verification level** (`none` / `basic` / `verified` / `elite`).
The number beneath it is the author's **momentum score**.

**Action:** make it self-explanatory — add a tiny caption/legend or a tap →
small explainer sheet, and a one-line legend on first feed view. Low effort,
include in Phase 38.

---

## Phase 35 — Post comments (currently non-functional)

The comment button in `FeedCard` has **no handler** and there is no comments
screen/store/sync. `posts.comments_count` + the `comments` feature flag exist,
so a `post_comments` table may be partly scaffolded — **verify in `schema.sql`
first**, extend or create.

**Backend — `phase35_comments.sql`:**
- `post_comments`: `id`, `post_id`, `user_id`, `parent_comment_id` (nullable
  self-ref → 1-level replies), `body` (1–2000 chars), `edited_at`,
  `created_at`. Indexes on `(post_id, created_at)` and `parent_comment_id`.
- RLS: read = any authed user; insert = self; update = author only (edit);
  delete = author / post owner / admin.
- `comment_likes` table (`comment_id`, `user_id`) + RLS.
- Trigger to keep `posts.comments_count` accurate on insert/delete.
- `post_comment_feed` view (joins author profile + `like_count` /
  `liked_by_me`, `security_invoker = true`). Add tables to realtime.

**Client:**
- `src/lib/sync/comments.ts` — fetch (threaded), add, edit, delete, toggle like.
- `src/store/useCommentsStore.ts` — keyed by postId.
- Comment row component: avatar, name, body, time, "edited" label, like, reply,
  and an overflow menu (edit / delete / report) gated by ownership.
- Replies render indented under parent; "Reply" sets `parent_comment_id`.
- Report a comment → reuse `reports` table with a `comment_id` target.

---

## Phase 36 — Post detail screen

- `src/screens/PostDetailScreen.tsx` — full post (reuse `FeedCard` body or a
  richer layout) + full comment thread + a sticky comment composer + back
  button. Pull-to-refresh.
- New Stack route `PostDetail: { postId: string }` in `Navigator.tsx`.
- Wire `FeedCard` `onPress` → `navigate('PostDetail', { postId })` **everywhere
  FeedCard is used**: `FeedScreen`, `ShowcaseScreen`, `SavedPostsScreen`,
  `ProfileScreen`/`UserProfileScreen` post lists.
- The comment button on `FeedCard` also opens `PostDetail` (scrolled to
  composer).

---

## Phase 37 — Share

- Share button in `FeedCard` actions row and in `PostDetailScreen`.
- Use React Native `Share.share()` with text + a deep link
  `scaletrek://post/<id>`.
- Deep-link handling: extend the existing deep-link hook
  (`src/lib/useOAuthDeepLink.ts` pattern) so opening `scaletrek://post/<id>`
  routes to `PostDetail`. Also handle `scaletrek://profile/<id>` and
  `scaletrek://thread/<id>` while we are in there.
- Later (optional): a public web fallback URL once a landing page exists.

---

## Phase 38 — Editing everywhere ("milestones" = posts)

A post **is** a milestone (`milestone_title`). Editing a post = editing a
milestone.

- **Posts:** `CreatePostScreen` accepts an optional `editPostId` — prefills
  fields, calls an `updatePost` sync fn instead of insert. Add `posts.edited_at`;
  show an "edited" tag on `FeedCard`. Entry: overflow menu on own posts.
  Re-editing a `reality` post should re-enter moderation (`status='pending'`).
- **Comments:** inline edit in the comment row (Phase 35 already adds
  `edited_at` + update RLS).
- **Messages:** `ChatScreen` long-press own message → Edit / Delete. Note the
  E2E encryption path — an edited message must be re-encrypted; add
  `messages.edited_at`, show "edited". Delete = soft-delete ("message removed").
- Consistent ownership-gated overflow menu component reused across posts /
  comments / messages.
- Verification-badge legend (item 0) ships here.

---

## Phase 39 — Support / Contact ("talk to us directly")

- `phase39_support.sql`: `support_tickets` (`id`, `user_id`, `subject`,
  `status` open/answered/closed, `created_at`) + `support_messages`
  (`ticket_id`, `sender_id`, `body`, `created_at`) for back-and-forth. RLS:
  user sees own tickets; admin sees all.
- `src/screens/SupportScreen.tsx` — user opens a ticket, sees the thread +
  admin replies (realtime). Entry: Settings → new "Support" row.
- `AdminScreen` — new "Support" tab to read and answer tickets.
- Optional: also email a copy to the team via an Edge Function.

---

## Phase 40 — Features we are missing (proposed additions)

1. **Notification deep-linking** — tapping a notification opens the relevant
   post / thread / profile (today it only opens the list).
2. **Server-event OS push** — `approve_post`, `reject_post`, `synergy_swipe`
   insert notification rows in SQL; wire a Supabase **Database Webhook** so
   those fire `send-push` too (client-created ones already do). Needs the
   service key configured server-side.
3. **Delete account + data export** — required by the Privacy Policy already in
   the app and by app stores. Settings → Account → Delete account (cascades),
   and a "download my data" request.
4. **Feed pagination / infinite scroll** — `fetchPosts` is capped at 200; add
   keyset pagination as content grows.
5. **Full-screen media viewer** — tap a post image/video → pinch-zoom lightbox.
6. **Comment & message search**, and make search results tappable through to
   `PostDetail` / profiles.
7. **Chat polish** — delivered/read receipts, typing indicator, unread badges.
8. **Block flow** — verify block fully hides content both ways; add an
   unblock list in Settings.
9. **`versionCode` bump policy** — still `1`; must increment per release before
   any Play Store submission.
10. **Empty/skeleton states** — extend the Phase-3 `Skeleton` primitive to
    feed, comments, chat, synergy while loading.
11. **Onboarding nudge** — prompt new users to fill strengths/bottlenecks so
    Synergy Match has signal.

---

## Suggested order for next session

1. Phase 35 (comments) + Phase 36 (post detail) — biggest user-visible gap;
   do together.
2. Phase 38 (editing) — depends on 35 for comment edit.
3. Phase 37 (share + deep links).
4. Phase 39 (support).
5. Phase 40 items by priority (1, 2, 3 first — deep-linking, push, account
   deletion).

Each phase: migration → `npx tsx supabase/apply-phase.ts <file>` → verify →
client → `tsc` → rebuild APK → commit. Keep `metro.config.js maxWorkers=3`
(low-RAM machine). Update `PROGRESS.md` + memory per phase.
