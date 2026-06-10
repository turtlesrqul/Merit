# Merit V4 Polish Design

> Approved direction: preserve the V4 editorial design, polish the current implementation, and fix core auth/UX issues without a full redesign.

## Goal

Make Merit V4 simpler, more usable, and more reliable by fixing password reset and email confirmation flows, reducing fragmented first-run CTAs, tightening signed-in app density, simplifying the dashboard, making People the candidate-search surface, and adding subtle Instagram support contact details.

## Priorities

- P0: Fix Supabase password reset so a reset email link opens a valid reset session and allows password update.
- P1: Simplify landing CTA, auto sign in after email confirmation, reduce app-page internal scale, simplify dashboard, and make People the people-search page.
- P2: Add Instagram support contact alongside the support email on auth surfaces.

## Design Decisions

- Landing primary CTA goes to `/home`, not `/sign-up`, so first-time visitors can explore Merit before auth.
- Dashboard/account actions still require sign-in.
- `/profile` becomes the utility dashboard workspace for profile basics, projects, passport preview, and sharing.
- `/people` is the canonical people directory. `/search` should redirect or defer to `/people` rather than showing mixed projects/results.
- Explore remains the project browsing surface and should show more project cards above the fold.
- No new dependencies, migrations, or environment secret changes.

## Auth Flow

- Signup confirmation links should continue through `/auth/callback`, exchange the Supabase code or token hash, establish cookies, and send confirmed users into `/home`.
- Password reset emails should redirect through `/auth/callback?next=/reset-password` so the app can establish the Supabase session before the reset form renders.
- `/reset-password` should also recover from direct code/hash links when possible and show clear expired/invalid-link fallback messaging.
- Supabase dashboard redirect URLs must include local and production callback/reset URLs.

## Dashboard Workspace

The dashboard should answer four questions:

- What does my Merit currently look like?
- What info do I need to fill in?
- Where do I add or edit projects?
- How do I share my Merit link?

The workspace should include:

- Simple left navigation.
- Overview section.
- Profile basics form.
- Project management access.
- Passport preview card inside the dashboard.
- Copy passport link action with a short copied state.
- Optional View Passport / View as recruiter link.

## QA

Run these checks after implementation:

- `npm run typecheck`
- `npm run build`
- `npm run test`
- Browser QA for landing, `/home`, `/people`, `/profile` signed-out redirect/guest state, auth pages, and `/reset-password` fallback state.
- Manual Supabase verification notes for reset and confirmation links if real email delivery cannot be exercised locally.
