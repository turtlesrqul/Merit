# Merit UI Redesign Handoff

Date prepared: 2026-06-09 22:52:47 +08:00

## Branches And Checkpoints

- Active redesign branch: `approved-ui-redesign`
- Protected pre-redesign checkpoint branch: `pre-ui-redesign-checkpoint`
- Safety backup branch: `pre-ui-redesign-working-tree-backup`
- Pre-redesign checkpoint commit: `e028dd9`
- Stage 1-3 redesign commit: `f988fa7f`
- Stage 4-6 redesign commit: `df6d3982`
- Local pre-redesign filesystem backup: `C:\Users\turtl\OneDrive\projects\merit-pre-ui-redesign-local-backup`

## Redesigned Routes

- `/`: editorial landing page for Merit.
- `/home`: public explore/archive grid with search and category filters.
- `/search`: authenticated-style search surface aligned to the editorial system.
- `/c/[userId]`: public portfolio profile.
- `/projects/[projectId]`: public project case-study detail.
- `/sign-in` and `/sign-up`: auth entry screens.
- `/forgot-password` and `/reset-password`: password recovery screens.

Authenticated creator routes were visually polished through shared editor components:

- Profile studio: `components/profile/profile-studio.tsx`
- Project editor: `components/projects/project-form.tsx`

## Component And System Changes

- Shared visual tokens and global CSS were consolidated in `app/globals.css`.
- Core primitives were tuned in `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, and `components/ui/textarea.tsx`.
- The public shell/header/footer was rebuilt in `components/app-shell.tsx`.
- Public project cards were rebuilt in `components/projects/project-card.tsx`.
- Public profile share/contact actions live in `components/profile/public-profile-actions.tsx`.
- Existing upload, auth, Supabase, validation, and persistence behavior was preserved.

## Backend And Data

- No database schema changes were added for the redesign.
- No new migrations were required.
- `lib/db/projects.ts` now includes existing `target_roles` data when building public profile/project views.
- No environment variable values or secrets were added to documentation.
- `.env.local` remains uncommitted and ignored.

## Screenshot Evidence

After-redesign screenshots are saved under:

```text
ui-reference-screenshots/after-redesign/
```

Desktop captures:

- `desktop/landing.png`
- `desktop/explore.png`
- `desktop/dashboard-guest.png`
- `desktop/project-detail.png`
- `desktop/public-profile.png`
- `desktop/project-editor.png`
- `desktop/login.png`
- `desktop/sign-up.png`
- `desktop/forgot-password.png`

Mobile captures:

- `mobile/landing-mobile.png`
- `mobile/explore-mobile.png`
- `mobile/public-profile-mobile.png`

The desktop full-page captures show a repeated right-side strip from the Browser full-page screenshot capture. A live viewport check on `http://localhost:3004/` confirmed the actual page has no horizontal overflow: `scrollWidth` matched `clientWidth`, no overflowing elements were detected, and console logs were empty.

`desktop/project-editor.png` was captured while unauthenticated, so it shows the sign-in redirect rather than an authenticated editor session.

## Verification

Code verification already passed on `approved-ui-redesign` after the Stage 4-6 implementation:

```powershell
npm run typecheck
npm run build
npm run test
```

Latest known result: all three commands passed, with 6 test files and 23 tests passing.

Additional rendered QA on `http://localhost:3004`:

- Landing page loaded with title `Merit`, expected hero text, no framework overlay, no console warnings/errors, and no horizontal overflow.
- `See examples` navigation moved from `/` to `/home`.
- Explore data loaded to 10 projects.
- Explore search interaction with `dice` filtered the archive to 1 project and showed `The Dice`.

## Known Limitations

- Authenticated creator flows were not browser-tested with a logged-in session in this pass.
- The saved full-page desktop Browser screenshots include a capture artifact on the far right; viewport screenshots and DOM measurements did not reproduce it as a layout bug.
- The Next.js dev tools button appears in development screenshots only.

## Restore

To return to the pre-redesign checkpoint:

```powershell
git switch pre-ui-redesign-checkpoint
```

To branch from the pre-redesign checkpoint without moving the protected branch:

```powershell
git switch -c restore-from-pre-ui-redesign pre-ui-redesign-checkpoint
```

To inspect the redesign state:

```powershell
git switch approved-ui-redesign
```
