# Merit V2 Handoff (2026-05-25)

## Snapshot
- Repo: `C:\Users\turtl\OneDrive\projects\merit_v2`
- Branch: `codex/v2-project-showcase`
- App is live on the existing Vercel project + existing Supabase project.
- Local repo is **dirty** (many modified/untracked files); this was deployed as requested.

## Live Deployment
- Production alias: `https://meritv3.vercel.app`
- Latest production deployment URL: `https://meritv2-66mra92wa-turtlesrquls-projects.vercel.app`
- Deployment inspect: `https://vercel.com/turtlesrquls-projects/merit_v2/8ZUiYJN9LqcZt6295TmKUB7AiVau`

## What Was Fixed In This Session
1. Restored Vercel project linkage (folder was unlinked):
   - `.vercel/project.json`
   - `projectId=prj_MDabusMjWRBzudLBoetwbo3lmwCc`
   - `orgId=team_r5brryggBZy7TA58guvQRFSN`

2. Fixed missing build input that blocked production build:
   - Restored `data/demo-accounts.json`

3. Resolved production middleware 500 (`MIDDLEWARE_INVOCATION_FAILED`):
   - Root cause: Vercel project running as `Framework Preset: Other` (wrong runtime behavior for Next middleware).
   - Fix:
     - `vercel.json` now explicitly sets `"framework": "nextjs"`.
   - Validation:
     - `/home` returns `200` on production.
     - Recent edge-middleware logs show healthy 200s and no new middleware 500.

4. Middleware edge-safety hardening kept in place:
   - `middleware.ts` includes local env/cookie helpers to avoid edge import/runtime incompatibilities.

## Key Files Touched Recently
- `C:\Users\turtl\OneDrive\projects\merit_v2\vercel.json`
- `C:\Users\turtl\OneDrive\projects\merit_v2\middleware.ts`
- `C:\Users\turtl\OneDrive\projects\merit_v2\data\demo-accounts.json`
- `C:\Users\turtl\OneDrive\projects\merit_v2\.vercel\project.json`
- `C:\Users\turtl\OneDrive\projects\merit_v2\.env.local` (restored earlier from backup)

## Backups / Revert Safety
- Pre-revert snapshot: `.codex-backups/pre-revert-20260524-030414`
- Revert target used earlier: `.codex-backups/20260524-full-overhaul-start`
- Environment restore source used: `.codex-backups/pre-revert-20260524-030414/.env.local`

## Current Functional Scope (High Level)
- Auth (signup/signin/signout + callback + resend verification)
- Discovery feed with de-dup sections + project interactions
- Profile Studio with inline passport editing + role editing
- Project CRUD + artifact upload + thumbnail upload + preview player
- Public passport pages (`/c/[userId]`) incl. CV display when valid
- Opportunities board + recruiter dashboard + match engine
- Moderation/reporting routes (feature-flag/admin gated)

## Known Caveats
- Repo is not in a clean git state; no single “safe release commit” was created in this session.
- Vercel Project Settings UI still shows framework preset details from project config history; repo-level `vercel.json` is currently forcing Next.js behavior and is what made prod healthy.
- Some older error logs still exist historically; check only recent time windows when validating new incidents.

## Recommended First Steps For Next Chat
1. Run production smoke test on `meritv3.vercel.app`:
   - sign in -> `/home`
   - open public passport
   - create/edit project with thumbnail upload
   - opportunities -> recruiter passport link
2. If stable, create a clean stabilization commit from current working tree.
3. Optionally clean up legacy `.v2.tsx`/backup artifacts if no longer needed.

## Useful Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm run test`
- Deploy prod: `npx vercel deploy --prod --yes`
- Prod middleware logs: `npx vercel logs --environment production --source edge-middleware --no-branch`
