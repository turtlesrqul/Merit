# Build Spec

This is a developer-ready plan, not an instruction to implement immediately.

## Feature Order

### V4.1

Build first:

1. Proof card builder.
2. Evidence model.
3. Recruiter search results redesign.
4. Candidate evidence profile.

Why:

These make the strategic shift real without requiring a full marketplace rebuild.

### V4.2

Build next:

1. Candidate comparison.
2. Role brief creation.
3. AI evidence summaries.
4. Evidence gaps.

### V4.3

Build later:

1. Recruiter dashboard/workspace.
2. Shortlist workflow.
3. Student improvement recommendations.
4. Recruiter notes and repeat-role workflow.

## Pages Needed

Possible routes:

- `/proof/new`
- `/proof/[proofId]`
- `/passport`
- `/c/[userId]` expanded as public passport
- `/recruiter/roles/new`
- `/recruiter/roles/[roleId]`
- `/recruiter/search`
- `/recruiter/candidates/[userId]`
- `/recruiter/compare`
- `/recruiter/shortlist`

## Components Needed

Student:

- `ProofBuilder`
- `ProofPreview`
- `EvidenceUploader`
- `EvidenceLevelIndicator`
- `EvidenceGapList`
- `PassportReadinessPanel`
- `TargetRolePicker`

Public:

- `PublicPassportHeader`
- `PublicProofCard`
- `EvidenceBackedSkills`
- `ProofTimeline`

Recruiter:

- `RoleBriefForm`
- `RecruiterEvidenceSearch`
- `CandidateEvidenceResult`
- `CandidateEvidencePreview`
- `CandidateEvidenceProfile`
- `CandidateComparisonTable`
- `ShortlistTable`
- `RecruiterNotes`

Shared:

- `ArtifactPreview`
- `SkillEvidenceMap`
- `EvidenceSummary`
- `ProofQualityBadge`
- `MissingEvidenceCallout`

## Data Model Ideas

Existing tables likely cover users, candidate profiles, projects, artifacts, skills, opportunities, and matches. V4 can evolve from these rather than throwing them away.

Possible additions:

### `proof_cards`

- `proof_id`
- `user_id`
- `project_id` nullable if migrated from existing project
- `target_role`
- `proof_claim`
- `candidate_contribution`
- `team_context`
- `timeline`
- `difficulty`
- `outcome`
- `recruiter_summary`
- `evidence_level`
- `published_at`
- `created_at`
- `updated_at`

### `proof_evidence`

- `evidence_id`
- `proof_id`
- `evidence_type`
- `source_url`
- `file_url`
- `preview_url`
- `source_label`
- `quality_level`
- `external_validator`
- `created_at`

### `proof_gaps`

- `gap_id`
- `proof_id`
- `gap_type`
- `message`
- `resolved_at`

### `role_briefs`

- `role_brief_id`
- `recruiter_user_id`
- `title`
- `description`
- `must_have_skills`
- `nice_to_have_skills`
- `evidence_preferences`
- `availability`
- `location`
- `created_at`
- `updated_at`

### `shortlist_items`

- `shortlist_item_id`
- `role_brief_id`
- `candidate_user_id`
- `status`
- `reason`
- `notes`
- `created_at`
- `updated_at`

## API / Function Ideas

- `POST /api/proof`
- `PATCH /api/proof/[proofId]`
- `POST /api/proof/[proofId]/evidence`
- `POST /api/role-briefs`
- `PATCH /api/role-briefs/[roleBriefId]`
- `POST /api/recruiter/search`
- `POST /api/recruiter/shortlist`
- `POST /api/ai/evidence-summary`
- `POST /api/ai/proof-improvement`

## Reusable UI Patterns

- Three-panel recruiter workspace.
- Two-column proof builder with live preview.
- Evidence quality indicator.
- Missing evidence callout.
- Candidate comparison matrix.
- Dossier-style public passport.

## Technical Risks

### Data Migration

Existing `projects` can become the base for `proof_cards`, but avoid a destructive migration until the proof model is validated.

Recommended first step:

- Add proof fields to existing project flow or create parallel proof tables with a project link.

### Evidence Trust

Do not overclaim verification. Evidence levels should reflect attached artifacts, not truth guarantees.

### AI Summary Reliability

AI summaries must cite source evidence and remain editable/dismissible.

### Recruiter Search Quality

Rules-based matching can support early V4. AI search should follow validated recruiter behavior.

### UI Scope

Recruiter workspace can become large quickly. Build search results and evidence profile first.

## What Can Be Built Now

- Proof card fields.
- Evidence level labels.
- Student proof builder.
- Public proof card display.
- Recruiter result card anatomy.
- Candidate evidence profile.
- Manual gaps checklist.
- Shortlist state.

## What Should Wait

- Full AI ranking.
- Automated candidate outreach.
- ATS integrations.
- Institution dashboards.
- Payment system.
- Advanced verification.
- Full recruiter analytics.

## Open Questions

- Should `projects` be renamed to `proof_cards` in code, or should V4 layer proof fields onto projects first?
- Should evidence level be computed or manually confirmed?
- What proof types matter most for the first recruiter ICP?
- Should candidate comparison be available before or after role briefs?
- Should public discovery show evidence levels to everyone or only recruiters?

## Recommended Build Slice

Smallest meaningful V4.1 slice:

1. Add proof-specific fields to project creation/editing.
2. Replace project card hierarchy with proof card hierarchy in a feature branch.
3. Add recruiter evidence result card.
4. Add candidate evidence profile for one selected candidate.
5. Add manual save/shortlist state.

Success criterion:

> A recruiter can review 5 candidates for a role and explain who they would interview based on Merit evidence.

