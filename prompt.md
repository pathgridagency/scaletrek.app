Act as an expert Senior Full-Stack Engineer and Software Architect. I am building a game-changing ecosystem feature for my application, "ScaleTrek," a platform that helps small businesses and entrepreneurs scale. 

The feature is called **"Synergy Match."** It is a cross-industry partnership portal that connects complementary founders (e.g., an agro-producer who needs tech + a software developer who needs a product; or a traditional artisan + a performance marketer) to form scalable businesses via sweat equity.

Please write the complete technical implementation plan, database schemas, matching logic, and frontend UI architecture for this feature based on the specifications below:

### 1. Core Feature Logic ("The Synergy Engine")
The matching isn't based on basic industry categories, but on mutual problem-solving. Every user profile tracks two primary arrays of tags:
- `strengths`: What the user masterfully executes (e.g., ["Video Production", "Content Creation", "Media Buying"]).
- `bottlenecks`: What is actively stopping the user from scaling (e.g., ["Physical Product Sourcing", "Supply Chain Logistics"]).
The matching algorithm must trigger a high "Synergy Score" when User A's `strengths` intercept User B's `bottlenecks`, and vice versa. It must be completely industry-agnostic.

### 2. Guardrails & Friction
To eliminate low-effort spam, implement a strict "Skin in the Game" validation layer:
- Users cannot view or swipe on matches unless their profile completion is at 100% (requires a verified portfolio link, completed business blueprint, or product description).
- The feature relies heavily on sweat equity/partnership terms, so matching must prompt a basic alignment questionnaire (e.g., Expected hours/week, Equity split expectations).

### 3. What You Need To Provide:

#### A. Database Schema
Provide the database models (preferably Prisma ORM / PostgreSQL compatible, or clean TypeScript types) extending our User profile to support:
- `strengths` and `bottlenecks` tags.
- A `VerificationStatus` enum.
- A `PartnershipMatch` model tracking states (Pending, Matched, Rejected) and the calculated `synergyScore`.

#### B. The Matching Algorithm Engine
Write a clean, optimized TypeScript backend function or API endpoint logic that:
- Queries potential matches while filtering out the current user and already swiped/rejected users.
- Calculates a mutual intersection score based on matching `strengths` to `bottlenecks`.
- Returns a sorted list of highly compatible profiles.

#### C. Frontend UI/UX Architecture (React + Tailwind CSS)
Design the component layout for a premium, clean dashboard view:
- **The Match Discovery Card:** A clean, high-end profile card showing the partner's core business, their "Superpower" (Strengths), their "Missing Piece" (Bottlenecks), and a clear "Synergy Match %" badge.
- Avoid generic dating-app tropes; make it feel professional, focused on execution, and narrative-driven.

Please provide modular, scalable code, and explain the step-by-step setup for this feature.