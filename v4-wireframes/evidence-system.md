# Evidence System

## Core Principle

Merit should make evidence easier to inspect, not pretend all evidence is equally strong.

The system should show what is known, what is attached, what is inferred, and what is missing.

## Proof Card Anatomy

A strong project proof card contains:

| Field | Purpose | Recruiter Question |
| --- | --- | --- |
| Project title | Names the work | What is this? |
| Role targeted | Maps proof to job intent | What role does this support? |
| Candidate contribution | Separates personal work from team output | What did they actually do? |
| Skills demonstrated | Connects work to capability | Which skills are backed by this? |
| Evidence attached | Provides inspectable proof | Can I see it? |
| Outcome / impact | Shows result | Did it work or matter? |
| Tools used | Adds practical context | What can they operate with? |
| Team or solo | Clarifies ownership | How much was theirs? |
| Timeline | Shows scope and pace | Was this a weekend, semester, or long build? |
| Difficulty | Helps calibrate depth | How complex was it? |
| Proof links | Opens external evidence | Can I verify or inspect further? |
| Screenshots | Gives quick visual signal | Can I understand it fast? |
| GitHub / Figma / live demo / testimonial links | Supports domain-specific proof | Is there a real artifact? |
| Recruiter-readable summary | Reduces review time | Why should I care? |
| Possible gaps / missing evidence | Builds trust through honesty | What should I be cautious about? |

## Evidence Quality Levels

### Level 1: Claim Only

Definition:

The candidate states they did something, but no evidence is attached.

Example:

> Built a React dashboard.

Display:

> Claim only. Add an artifact to strengthen this proof.

Recruiter interpretation:

Useful for context, weak for decision-making.

### Level 2: Claim + Screenshot

Definition:

The candidate provides a visual artifact but no working link, repo, or external validation.

Example:

> Product dashboard screenshot.

Display:

> Screenshot attached.

Recruiter interpretation:

Good for quick understanding, not enough for technical or outcome validation.

### Level 3: Claim + Working Link / Repo / Artifact

Definition:

The candidate provides an inspectable artifact: live demo, repo, Figma, PDF, deck, prototype, or case study.

Display:

> Inspectable artifact found.

Recruiter interpretation:

Strong enough for first-pass screening.

### Level 4: Claim + Usage / Testimonial / Measurable Outcome

Definition:

The candidate attaches evidence that someone used, reviewed, validated, graded, adopted, or benefited from the work.

Examples:

- "Used by 42 students."
- "Client testimonial attached."
- "Won hackathon category."
- "Reduced manual review time by 30%."

Display:

> Outcome evidence attached.

Recruiter interpretation:

Strong hiring signal when contribution is clear.

### Level 5: Claim + Verified External Validation

Definition:

Evidence has a credible external validator or verifiable external source.

Examples:

- Published research.
- Employer/client confirmation.
- Public GitHub commit history plus shipped product.
- Competition result page.
- Institution/program validation.

Display:

> External validation found.

Recruiter interpretation:

Highest evidence confidence, but still not a hiring decision.

## How To Show Evidence Quality

Use modest labels:

- Claim only.
- Screenshot attached.
- Inspectable artifact.
- Outcome evidence.
- External validation.

Avoid overclaiming:

- Do not say "verified" unless the validation mechanism exists.
- Do not say "AI verified."
- Do not imply Merit guarantees truth.
- Do not assign a fake absolute ability score.

## Evidence Completeness

Evidence completeness can be a checklist, not a person score.

Checklist:

- Target role selected.
- Contribution explained.
- Artifact attached.
- Skills mapped.
- Outcome added.
- Team/solo clarified.
- External validation present.

Possible states:

- Draft.
- Presentable.
- Recruiter-readable.
- Strong signal.

## Evidence Gap Examples

Show gaps in calm, useful language:

- "Contribution unclear: explain what you personally owned."
- "Outcome missing: add users, result, grade, client, or lesson learned."
- "No inspectable artifact: add a live link, repo, PDF, Figma file, or screenshot."
- "Team context missing: clarify team size and your role."

## Data Model Sketch

Potential entities:

- `proof_cards`
- `proof_evidence`
- `proof_skills`
- `proof_outcomes`
- `proof_gaps`
- `role_briefs`
- `candidate_shortlist_items`

Potential evidence fields:

- `evidence_type`
- `source_url`
- `file_url`
- `preview_url`
- `quality_level`
- `source_label`
- `summary`
- `external_validator`
- `created_at`

