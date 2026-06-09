# Merit V4 Wireframes

Date: 2026-06-03  
Status: Product design, UX architecture, and low-fidelity wireframes only  
Constraint: Do not implement these changes in the app until this package is reviewed.

## Strategic Shift

Merit V4 shifts the product from a student portfolio platform to a proof-based hiring platform.

The student side creates supply: projects, artifacts, outcomes, skills, and contribution history. The recruiter side receives the commercial value: faster discovery, clearer evidence, better shortlist decisions, and less time wasted reviewing weak profiles.

The V4 position:

> Merit helps companies make better early-career hiring decisions by surfacing structured evidence of what candidates have actually built.

## Final Product Direction

Merit should become the evidence layer for early-career hiring.

LinkedIn shows people. Merit shows why someone is worth interviewing.

Resumes tell recruiters what someone claims. Merit shows what they have actually built.

The core product objects are:

- **Proof Card:** the atomic evidence object around one project or body of work.
- **Merit Passport:** the public candidate dossier made from proof cards, target role, contact, CV, and evidence-backed skills.
- **Role Brief:** the recruiter-defined hiring need that tells Merit what proof to surface.
- **Evidence Summary:** the recruiter-readable explanation of relevant proof, not a fake hiring decision.
- **Shortlist:** the buyer-side output that proves PMF.

## Most Important Screens

1. **Student Proof Builder:** begins with "Build your first proof card," not "complete your profile."
2. **Proof Card:** shows artifact, contribution, skills, outcome, evidence level, and gaps.
3. **Public Student Passport:** gives recruiters a clean evidence dossier.
4. **Recruiter Role Brief:** starts every recruiter workflow with the job to be done.
5. **Recruiter Search Results:** shows candidates by role-relevant proof, not generic profile cards.
6. **Candidate Evidence Profile:** answers "Who should I interview, and why?"
7. **Candidate Comparison:** lets recruiters compare evidence, gaps, and shortlist rationale.

## Most Important Features

- Role-first student onboarding.
- Strongest-project-first proof creation.
- Evidence quality levels from claim-only to externally validated proof.
- Recruiter role briefs.
- Search results redesigned around evidence summaries.
- Candidate evidence profile.
- Save, shortlist, and compare workflows.
- AI summaries that organize evidence without pretending to decide.

## How This Differs From Old Merit

Old Merit already has strong foundations: auth, project CRUD, discovery, public passports, opportunities, recruiter dashboard, and a rules-based match engine.

V4 changes the product hierarchy:

- "Project" becomes "Proof Card."
- "Profile" becomes "Passport."
- "Discovery" becomes "Evidence Search."
- "Recruiter Dashboard" becomes "Recruiter Workspace."
- Engagement metrics move down.
- Evidence, fit, contribution, outcome, and missing proof move up.

## Build First

V4.1 should build:

1. Proof card data model and builder.
2. Evidence quality system.
3. Recruiter search results redesign.
4. Candidate evidence profile.

These are the smallest set of changes that make the strategic shift real.

## Do Not Build Yet

Do not start with:

- Full social feed mechanics.
- Heavy engagement metrics.
- Enterprise ATS integrations.
- Institution dashboards.
- Fully automated AI hiring scores.
- Broad job board expansion.
- A complex student community system.

The PMF test is recruiter confidence, not total uploaded projects.

## Folder Map

- [product-strategy.md](product-strategy.md): what Merit is and is not.
- [information-architecture.md](information-architecture.md): V4 structure across public, student, recruiter, and internal surfaces.
- [user-flows.md](user-flows.md): student and recruiter flows.
- [screen-by-screen-wireframes.md](screen-by-screen-wireframes.md): detailed screen specs.
- [recruiter-experience.md](recruiter-experience.md): buyer-side UX.
- [student-experience.md](student-experience.md): supply-side UX.
- [evidence-system.md](evidence-system.md): proof card and evidence levels.
- [ai-layer.md](ai-layer.md): careful AI positioning.
- [visual-wireframes.md](visual-wireframes.md): ASCII and Mermaid wireframes.
- [build-spec.md](build-spec.md): developer-ready build plan.
- [visuals/](visuals/): SVG wireframes and static HTML preview.

