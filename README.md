# Merit

Proof over pedigree.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- OpenAI API (Career Coach)

## Current Scope
- Auth (sign up/sign in/sign out)
- App shell
- Candidate profile creation/editing
- Profile completion scoring
- Candidate/Recruiter account mode toggle
- Project CRUD (create/edit/delete)
- Visual artifact previews (website/media/github/figma thumbnail support)
- Discovery feed from database projects
- Save + Inspired interactions
- Public candidate profile page
- Opportunities board for candidates
- Recruiter dashboard (post roles, candidate discovery, run matching)
- Rules-based match engine with persisted match scores
- Career Coach panel (`/api/career-coach`) with OpenAI + rules fallback
- Supabase schema + RLS migration

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in Supabase credentials in `.env.local`.
   - For demo seeding and drag/drop file uploads, also add `SUPABASE_SERVICE_ROLE_KEY`.
   - Optional: set `NEXT_PUBLIC_SUPABASE_ARTIFACT_BUCKET` (defaults to `project-artifacts`).
4. (Optional but recommended) Add `OPENAI_API_KEY` for AI Career Coach responses.
5. Run the app:
   ```bash
   npm run dev
   ```
6. Seed hackathon demo accounts (optional but recommended for demos):
   ```bash
   npm run seed:demo
   ```
   - Seeds candidate demo users with project portfolios
   - Seeds one recruiter demo user with fake internship role postings

## Database Migration
Apply:

`supabase/migrations/202604210001_init_merit_schema.sql`
`supabase/migrations/202604210002_project_child_table_policies.sql`
`supabase/migrations/202604210003_skill_tags_insert_policy.sql`
`supabase/migrations/202604210004_artifact_preview_column.sql`
`supabase/migrations/202604220001_matches_rationale_and_recruiter_policies.sql`

## Scripts
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run seed:demo`
