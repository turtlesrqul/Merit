# UI Redesign Audit

Date: 2026-06-09
Active branch: `approved-ui-redesign`
Checkpoint commit: `e028dd9`

## Framework

- Next.js 15 app router with React 19 and TypeScript.
- Styling uses Tailwind CSS plus global CSS variables in `app/globals.css`.
- Supabase integration uses `@supabase/ssr` for browser/server clients.
- Tests use Vitest via `vitest.config.mjs`.

## Current Routes

- `/` redirects to `/home`.
- `/home` is the main discovery/explore route and supports guest browsing.
- `/search` is authenticated global search for projects and people.
- `/people` is a people directory route.
- `/c/[userId]` is the public profile route.
- `/projects/[projectId]` is the public project detail route.
- `/projects/new` creates projects.
- `/projects/[projectId]/edit` edits projects.
- `/profile` is the authenticated dashboard/profile studio.
- `/opportunities` and `/recruiter` support recruiting workflows.
- `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/callback`, and `/auth/verified` support auth flows.
- `/privacy` and `/terms` are static legal routes.
- API routes support artifact upload, career coach, matches, moderation hide/unhide, and project reporting.

## Existing Components

- Shared shell: `components/app-shell.tsx`.
- Auth: `components/auth/auth-form.tsx`, `components/auth/auth-session-sync.tsx`.
- Public/project UI: `components/projects/project-card.tsx`, `discovery-feed.tsx`, `project-interactions.tsx`, `project-preview-player.tsx`, `project-live-preview.tsx`, `project-report-button.tsx`, `project-owner-actions.tsx`.
- Editing: `components/projects/project-form.tsx`, `components/profile/profile-studio.tsx`.
- Discovery/profile: `components/profile/people-directory.tsx`, `profile-project-search.tsx`, `profile-completion-prompt.tsx`.
- Recruiter/opportunities: `components/opportunities/*`, `components/recruiter/*`.
- UI primitives: `components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`.

## Styling Approach

- Current UI already uses warm cream backgrounds, serif headings, gold accents, cards, rounded borders, and soft shadows.
- The approved screenshots are stricter and more editorial: flatter surfaces, larger white space, thinner borders, sharper rectangular controls, less rounded chrome, fewer gradients, less shadow, and much more prominent imagery.
- Current global background uses subtle radial gradients. Reference screenshots use a flatter off-white canvas with hairline separators.

## Supabase And Backend Integration

- Server client: `lib/supabase/server.ts`.
- Browser client: `lib/supabase/browser.ts`.
- Env parsing: `lib/supabase/env.ts`, preserving deploy-platform URL normalization.
- Admin/service role logic exists in `lib/supabase/admin.ts` for server-only operations.
- Cookie options are centralized in `lib/supabase/cookie-options.ts`.
- Public config helpers live in `lib/public-config.ts` and runtime feature flags in `lib/runtime-config.ts`.

## Authentication Flow

- Sign-in and sign-up use `components/auth/auth-form.tsx`.
- Sign-up supports email verification, pending verification state in local storage, resend cooldowns, terms acceptance, and auth error mapping.
- Forgot/reset password routes are present.
- Auth callback and verified pages are present.
- Sign-out lives in `AppShell` and redirects to `/home`.

## Storage And Upload Logic

- `components/projects/project-form.tsx` uploads artifact files through `/api/artifacts/upload`.
- Project artifacts support uploaded files, external links, generated previews, and thumbnail/cover image upload.
- File size limits: 50MB artifacts, 10MB thumbnails.
- Profile studio supports CV/portfolio uploads with file type and size checks.
- These flows must remain wired to Supabase storage and should only be restyled.

## Public Profile Flow

- `/c/[userId]` fetches public candidate data server-side through `fetchPublicCandidateData`.
- It shows profile summary, projects, recruiter opportunities if applicable, CV/resume preview, about/contact, and portfolio links.
- Current visual mismatch: the page reads as stacked SaaS cards rather than a portfolio exhibition.

## Project Creation And Editing Flow

- `/projects/new` and `/projects/[projectId]/edit` use `ProjectForm`.
- The form preserves title, hook, project type, skills, artifacts, cover image URL, impact, validation, upload state, thumbnail upload, and schema-compat fallback behavior.
- Must be restyled, not rewired.

## Explore Or Discovery Flow

- `/home` fetches discovery projects for guests and signed-in users.
- `DiscoveryFeed` builds curated rows, supports search/filtering client-side, and includes save/inspire interactions for signed-in users.
- `/search` performs authenticated global search across projects and members.
- Reference direction wants a flatter curated archive grid with simple filters and fewer metadata-heavy cards.

## Existing Responsive Behaviour

- Tailwind breakpoints are used throughout.
- Current app has horizontal rails and card grids.
- Reference mobile public profile is intentionally single-column with large imagery, simple top nav, compact actions, and open sections.
- Mobile dashboard/forms need cleaner grouping and less cramped card chrome.

## Existing Working Features To Preserve

- Guest discovery browsing.
- Supabase auth, email/password login, sign-up, resend verification, forgot/reset password.
- Public profile URLs.
- Public project detail URLs.
- Project create/edit.
- Artifact and thumbnail uploads.
- Save/inspire interactions.
- Project view tracking.
- Project reports and moderation endpoints.
- Recruiter/opportunity workflows.
- Profile editing, CV/portfolio upload, saved projects, project owner actions.
- Existing environment variable compatibility.

## Broken Or Incomplete Features Observed

- Baseline screenshot capture via Browser plugin failed: the in-app webview did not attach, then navigation failed. Local HTTP returned 200 and the Next dev server was ready.
- No local Chrome/Edge/Playwright executable was available for headless screenshot fallback.
- `/search` redirects guests to sign-in, while the redesign brief says explore should preserve guest browsing. `/home` currently satisfies guest discovery.
- Current public profile lacks strong profile image/location/availability fields unless supported by existing data; the redesign must gracefully omit unsupported fields or derive only from existing fields.

## Visual Mismatches Against Reference

- Header is too dense and product-dashboard-like, with tagline rows, nav pills, global search, and rounded controls.
- Public profile hero is a gradient card rather than an open editorial intro.
- Project cards use heavy shadows, rounded cards, metadata badges, gradients, and engagement metrics; references use large images, simple category labels, serif titles, and sparse metadata.
- Project detail starts in a card and sidebar layout; reference uses open back link, huge serif title, metadata row, hero image, and long editorial sections.
- Dashboard uses broad cards and empty-state boxes; reference uses flatter panels, left nav, hairline borders, and yellow primary actions.
- Forms are visually close in tone but need flatter sections, clearer grouping, and less rounded/shadowed inputs.

## Components To Restyle

- `AppShell`
- `Button`, `Card`, `Badge`, `Input`, `Textarea`
- `ProjectCard`
- `DiscoveryFeed`
- `ProjectPreviewPlayer` framing
- `AuthForm`
- `ProfileStudio`
- `ProjectForm`
- Public profile and project-detail pages
- Search/explore page surfaces

## Components To Replace Or Significantly Refactor

- Public profile page composition in `app/c/[userId]/page.tsx`.
- Project detail composition in `app/projects/[projectId]/page.tsx`.
- Discovery card/grid presentation in `components/projects/discovery-feed.tsx`.
- Global app shell density and navigation model in `components/app-shell.tsx`.

## Backend-Integrated Components To Preserve Carefully

- `ProjectForm`: upload, validation, schema fallback, insert/update mutations, artifact relation updates.
- `ProfileStudio`: profile save, uploads, modal state, saved/inspired project state.
- `ProjectInteractions`: save/inspire mutations.
- `ProjectReportButton`: report API integration.
- Server data helpers in `lib/db/*`.
- Supabase clients and env helpers in `lib/supabase/*`.

## Dirty Worktree Preservation Audit

- Source files checkpointed: modified and new app routes, API routes, components, `lib/*`, tests, scripts, package files, middleware, Next/TS/Tailwind config.
- Database migrations checkpointed: `supabase/migrations/202605050001_v2_project_showcase.sql`, `supabase/migrations/202605140001_moderation_baseline.sql`.
- Public/visual assets checkpointed: `brand/visuals/*`, `design-experiments/*`, `v4-wireframes/visuals/*`.
- Configuration files checkpointed: `.env.example`, `.gitignore`, `.vercelignore`, `vercel.json`, `vitest.config.mjs`, package files.
- Documentation checkpointed: `README.md`, `handoff.md`, `brand/*.md`, `docs/*.md`, `v4-wireframes/*.md`.
- Generated artifacts ignored: `.next/`, `node_modules/`, `.vercel/`, logs, temporary browser folders, `tsconfig.tsbuildinfo`.
- Secret files ignored: `.env.local`, `.env`, `.env.*` except `.env.example`.
