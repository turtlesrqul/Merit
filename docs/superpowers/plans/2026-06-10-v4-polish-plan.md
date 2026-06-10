# Merit V4 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish Merit V4 without redesigning it, prioritizing auth/session reliability and core product clarity.

**Architecture:** Keep the existing Next.js App Router structure and Supabase SSR/browser clients. Make targeted edits to auth URL routing, callback/session handling, public navigation, People/Explore surfaces, and the existing profile studio rather than adding new systems.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase SSR, Tailwind CSS, Vitest.

---

### Task 1: Auth Session Repair

**Files:**
- Modify: `lib/auth/auth-urls.ts`
- Modify: `app/auth/callback/route.ts`
- Modify: `app/(auth)/reset-password/page.tsx`
- Modify: `components/auth/auth-form.tsx`
- Modify: `app/auth/verified/page.tsx`
- Modify: `docs/meritsg-domain-smtp.md`

- [ ] Route password reset links through `/auth/callback?next=/reset-password`.
- [ ] Keep signup confirmation links routed through `/auth/callback?next=/home&from=signup`.
- [ ] Make successful signup confirmation land in `/home`, with `/auth/verified` retained only as fallback/status copy.
- [ ] Let reset page exchange direct `code` links and consume hash tokens if Supabase sends implicit recovery links.
- [ ] Improve invalid/expired reset fallback copy.
- [ ] Document Supabase dashboard redirect URLs.

### Task 2: Public Entry And Explore Density

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `components/projects/discovery-feed.tsx`
- Modify: `components/projects/project-card.tsx`

- [ ] Change the landing primary CTA to `/home`.
- [ ] De-emphasize signup from the landing hero while keeping nav auth actions.
- [ ] Tighten Explore heading, search/filter spacing, grid gaps, thumbnail height/aspect behavior, and card type scale.
- [ ] Preserve the outer editorial margins.

### Task 3: People/Search Cleanup

**Files:**
- Modify: `components/app-shell.tsx`
- Modify: `app/search/page.tsx`
- Modify: `app/people/page.tsx`
- Modify: `components/profile/people-directory.tsx`

- [ ] Update signed-in navigation from Search to People.
- [ ] Make `/search` redirect to `/people`.
- [ ] Keep People focused on people/candidates only.
- [ ] Preserve working people search over name, headline, role, skills, and recent project titles/categories.

### Task 4: Dashboard Workspace Simplification

**Files:**
- Modify: `components/profile/profile-studio.tsx`
- Potentially modify: `app/profile/page.tsx`

- [ ] Reduce dashboard sections to overview, edit profile, projects, passport preview, and saved/activity only if needed.
- [ ] Add public passport preview inside dashboard.
- [ ] Add copy passport link action with copied feedback.
- [ ] Keep add/manage project access obvious.
- [ ] Reduce readiness-score emphasis and scattered edit icons.
- [ ] Preserve profile persistence, uploads, project management, and public profile links.

### Task 5: Support Contact Polish

**Files:**
- Modify: `lib/public-config.ts`
- Modify: `components/auth/auth-form.tsx`
- Modify: `app/(auth)/forgot-password/page.tsx`
- Modify: `app/(auth)/reset-password/page.tsx`
- Modify: `.env.example` if new public variable names are useful.

- [ ] Ensure default support email remains `hello@meritsg.com`.
- [ ] Add Instagram `@ryan.fahrein` as a subtle secondary support contact.
- [ ] Avoid secret values and do not touch `.env.local`.

### Task 6: Verification

**Commands:**
- `npm run typecheck`
- `npm run build`
- `npm run test`

**Browser QA:**
- `/`
- `/home`
- `/people`
- `/profile` signed-out state
- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/reset-password`

- [ ] Confirm no relevant console warnings/errors.
- [ ] Confirm mobile layout for landing, auth, explore, people, and dashboard where possible.
- [ ] Report any Supabase email-link flows that require live email/dashboard verification.
