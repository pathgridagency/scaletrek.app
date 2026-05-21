Role: Principal Full-Stack Mobile Architect & Supabase Database Engineer
Context: We are finalizing "ScaleTrek", an Android-first neofuturistic mobile app built with Expo (SDK 54), React Native, and TypeScript. Our live Supabase project URL is: https://yhezvbyngzimzmoyhtjl.supabase.co

Objective: Fully connect the local React Native app codebase to our live Supabase instance, establish database security, build out the remaining core features, and wire everything into working execution logic. Write pure, high-performance production code. No placeholders.

### PHASE 1: ENVIRONMENT & ENVIRONMENT LINKING
1. Create or update the local `.env` and `src/config/env.ts` files to explicitly map the Supabase project URL to: https://yhezvbyngzimzmoyhtjl.supabase.co
2. Verify that `src/lib/supabase.ts` correctly instantiates the createClient instance using the unified environment variables and implements secure token storage using `expo-secure-store`.

### PHASE 2: ROW-LEVEL SECURITY DEPLOYMENT (policies.sql)
Analyze our existing Supabase tables (profiles, posts, deals, chats) to generate a complete execution script in `supabase/policies.sql` to secure our data:
- Profiles Table: Public read access for authenticated users; write/update permissions restricted strictly to row owners where auth.uid() == id.
- Posts Table: Public read access for authenticated users; creation and deletion restricted strictly to the user matching user_id.
- Chats & Deals Tables: Enforce total data isolation. Read/Write access allowed ONLY if the authenticated user's id matches either the sender/receiver or investor/business columns.

### PHASE 3: COMPONENT REALIZATION & CORE LOGIC IMPLEMENTATION
1. Implement the empty `components/showcase/` directory: Create a media-heavy `MilestoneCard.tsx` component that renders progress updates, and a dynamic `MetricTicker.tsx` to handle verifiable metrics (revenue markers, user numbers).
2. Implement the empty `components/investor/` directory: Create an `InvestorControlPanel.tsx` with an interactive risk-reward slider that hooks into `useFeedStore` to filter out 'Dreamers' versus 'Reality Checks' timelines in real-time.
3. Wire the Momentum Logic: Connect the `MomentumPill` UI and profiles to an automated script logic that updates active user rankings based on their update frequencies.

### PHASE 4: ENCRYPTED DEAL HANDSHAKE & PIPELINE COMPLETION
1. Build out `src/lib/crypto.ts` utilizing `tweetnacl` to handle on-device asymmetric key generation.
2. Complete the data wiring inside `useChatStore`. When a deal transition updates to the 'negotiating' phase, execute a key-exchange handshake so that all subsequent message text is encrypted on-device before syncing to the Supabase database.

### PHASE 5: VERIFICATION CHECKLIST
Review `Navigator.tsx` to ensure all screen transitions (AuthGate, FeedScreen, InvestorScreen, DealPipelineScreen, AdminScreen) cleanly subscribe to their respective Zustand data states fed from our live Supabase link. Run an internal code lint and check to ensure there are no open loopholes or broken connections.

Execute Phase 1 and Phase 2 first, update the project files, and report back with the confirmation details before proceeding to the UI components.