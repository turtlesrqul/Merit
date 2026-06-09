# Merit PMF Strategy

Date: 2026-06-03  
Status: Product-market fit strategy, not implementation  
Primary thesis: Merit reaches PMF when recruiters repeatedly use structured student proof to make faster, more confident shortlist decisions.

## Executive Verdict

Merit's PMF path should not be "get many students to upload projects." That is supply creation, not fit.

The PMF path should be:

> Recruiters can identify, explain, and shortlist promising early-career candidates faster after reviewing Merit proof cards than after reviewing resumes, LinkedIn profiles, or scattered portfolio links.

The brand work is already pointed in the right direction: "Proof over pedigree," "proof-of-ability platform," "Passport," and "Proof Card" are strong. The next step is to make those ideas operational.

The product should optimize for a recruiter confidence loop:

1. A recruiter defines a role.
2. Merit surfaces candidates with proof relevant to that role.
3. The recruiter inspects proof cards.
4. The recruiter can explain why a candidate is promising.
5. The recruiter shortlists or contacts the candidate.
6. Merit learns which proof signals mattered.

If this loop works, student acquisition becomes easier because there is real demand on the other side. If this loop does not work, more student profiles only create a prettier portfolio directory.

## Current Strategic Context

Merit already has:

- Auth and verified email flow.
- Candidate profiles/passports.
- Project CRUD.
- Artifact previews.
- Discovery feed.
- Public candidate pages.
- Opportunities board.
- Recruiter dashboard.
- Rules-based match engine.
- Match scores and rationale direction.

The issue is not lack of MVP surface area. The issue is PMF sharpness.

Current product language and UI still over-index on:

- Discovery.
- Projects.
- Profiles.
- Gallery rows.
- Engagement metrics.
- General search.

PMF language should over-index on:

- Proof strength.
- Role fit.
- Evidence completeness.
- Recruiter confidence.
- Shortlist rationale.
- Candidate readiness.

## The Wedge

### Recommended Beachhead

Singapore early-career hiring for internships, junior roles, startup roles, and project-based student talent.

### Initial Supply

Students with visible work:

- Hackathon projects.
- Figma/design projects.
- Startup ideas and MVPs.
- Research posters.
- Decks and documents.
- Web apps.
- Client/freelance-style projects.
- Capstone and school projects.

### Initial Demand

Recruiters and hiring decision-makers who struggle to evaluate early-career talent from resumes alone:

- Startups hiring interns or junior operators.
- Small agencies hiring design, marketing, or product interns.
- SMEs hiring generalist interns.
- Campus recruiters seeking stronger pre-screening.
- Founder-led teams that do not have mature recruiting processes.
- Accelerator/startup ecosystem partners looking for student builders.

### Narrow PMF Claim

Do not claim:

> Merit replaces LinkedIn, Handshake, or resumes.

Claim:

> Merit helps recruiters screen early-career candidates with clearer proof than resumes alone.

## ICP

### Buyer ICP

The best first buyer is not a large enterprise HR department. It is a hiring owner with urgency and low process burden.

Ideal first buyer:

- Founder, recruiter, campus lead, or hiring manager.
- Hiring 1-10 interns or junior candidates per quarter.
- Open to non-traditional talent.
- Cares more about demonstrated ability than pedigree.
- Does not have a sophisticated early-career screening stack.
- Will take a meeting and give direct feedback.

Poor first buyer:

- Large enterprise with long procurement.
- Recruiter who only hires from fixed school lists.
- Hiring team that requires ATS integration before trying anything.
- Employer that does not actually review student work.

### Student ICP

The best first student is not "any student." It is a student with one strong proof artifact and a reason to be discovered.

Ideal first student:

- Has at least one project with visual or inspectable output.
- Can explain their role and contribution.
- Wants internship, junior role, freelance-style work, or startup opportunity.
- Is proud enough to share a public passport.
- Is willing to improve the passport if recruiter feedback is clear.

Poor first student:

- No work artifact yet.
- Only wants a resume template.
- Will not add context to projects.
- Wants a social profile, not hiring signal.

## Jobs To Be Done

### Recruiter Job

When I am screening early-career candidates and resumes all look the same, I want to see concrete work evidence and role-fit rationale so I can shortlist with confidence.

### Student Job

When I am trying to get discovered without elite pedigree or years of experience, I want my real work to look credible and recruiter-readable so I can be judged by what I can do.

### Founder/Investor Job

When I evaluate Merit, I want proof that recruiters will repeatedly return to find and assess candidates so I can believe this becomes a marketplace or hiring infrastructure company.

## PMF Hypotheses

### Hypothesis 1: Recruiters Need Evidence, Not More Profiles

Recruiters do not need another list of candidates. They need a way to reduce uncertainty.

Test:

- Give recruiters 10 resumes and 10 Merit passports for the same candidate set.
- Ask which candidates they would interview.
- Measure confidence, time to decision, and rationale clarity.

Success:

- Recruiters make shortlist decisions faster with Merit.
- Recruiters can explain their choices with proof evidence.
- Recruiters ask to see more candidates in the same format.

### Hypothesis 2: The Proof Card Is The Atomic PMF Object

The passport matters, but the proof card is where trust is created.

Test:

- Show recruiters project cards with current anatomy.
- Show revised proof-card anatomy on paper or in a static doc:
  - What was built.
  - Candidate role.
  - Skills demonstrated.
  - Evidence artifact.
  - Outcome.
  - Role relevance.
  - Missing evidence.
- Ask which card lets them screen faster.

Success:

- Recruiters prefer structured proof cards over portfolio-style project cards.
- Recruiters can identify red flags and strengths without opening five links.

### Hypothesis 3: Students Will Improve Profiles If Recruiter Feedback Is Concrete

Students will not polish passports forever in a vacuum. They will improve them if they know what recruiters care about.

Test:

- Give students a "recruiter readiness" checklist based on real recruiter feedback.
- Ask them to improve one proof card.
- Measure completion and quality delta.

Success:

- Students add clearer role, skills, outcomes, and artifacts.
- Completion improves without founder hand-holding.

### Hypothesis 4: Concierge Matching Beats Self-Serve Discovery At First

Self-serve marketplaces are noisy before density. PMF discovery should be concierge-assisted.

Test:

- Recruiter submits role.
- Merit manually curates 10 candidates.
- Recruiter reviews with structured rationale.
- Track shortlist and feedback.

Success:

- Recruiter shortlists at least 2 candidates.
- Recruiter gives feedback specific enough to improve matching.
- Recruiter agrees to repeat for another role or introduce another hiring owner.

## PMF Metrics

### North Star

Recruiter-qualified shortlists created from structured proof.

Definition:

A recruiter-qualified shortlist is a set of candidates a recruiter says they would interview or seriously consider after reviewing Merit proof.

### Input Metrics

- Number of students with at least one complete proof card.
- Number of proof cards with artifact, role, skills, and outcome.
- Number of recruiter roles submitted.
- Number of curated candidate sets delivered.
- Number of recruiter review sessions completed.

### Activation Metrics

Student activation:

- Publishes one recruiter-readable proof card.
- Shares or views public passport.
- Adds contact and target role.

Recruiter activation:

- Submits a real role.
- Reviews at least five candidates.
- Shortlists at least one candidate.
- Gives feedback on proof relevance.

### Retention Metrics

- Recruiter returns with another role.
- Recruiter asks for more candidates.
- Recruiter contacts shortlisted candidates.
- Student improves passport after feedback.
- Candidate gets interview or follow-up.

### Quality Metrics

- Average recruiter confidence score before and after viewing proof.
- Time to shortlist.
- Shortlist rate per curated batch.
- Interview conversion from Merit shortlist.
- Percentage of proof cards marked "clear evidence" by recruiters.

### Bad Metrics To Avoid As PMF Proof

- Total signups.
- Number of projects uploaded.
- Page views.
- Likes.
- Saves.
- Generic "engagement."
- Student enthusiasm without recruiter pull.

These can be supporting metrics, but they are not PMF.

## 90-Day PMF Plan

### Phase 1: Recruiter Discovery Sprint

Timeline: Days 1-21

Goal:

Find the narrow recruiter segment that feels the pain most sharply.

Actions:

- Interview 20 recruiters/hiring owners.
- Focus on startup founders, agency owners, campus recruiters, and SME hiring managers.
- Ask about their last early-career hire.
- Collect screening artifacts: resumes, portfolio links, job descriptions, scoring rubrics.
- Identify which proof types actually matter for each role.

Deliverable:

- PMF interview report.
- Top 3 recruiter ICPs.
- Top 5 proof signals recruiters trust.

Decision gate:

Continue only with the segment where recruiters show active hiring pain and willingness to review candidates.

### Phase 2: Concierge Proof Matching

Timeline: Days 22-45

Goal:

Prove recruiters can shortlist candidates faster through Merit-style proof.

Actions:

- Select 5 recruiter partners.
- Ask each for one real role.
- Manually curate 10 candidates per role.
- Prepare proof summaries for each candidate.
- Run live review sessions.
- Measure confidence and shortlist decisions.

Deliverable:

- 50 recruiter-reviewed candidate profiles.
- Shortlist conversion data.
- Evidence of which proof signals drive decisions.

Decision gate:

If fewer than 30% of reviewed candidates are shortlisted or seriously considered, the proof structure or candidate supply is not strong enough yet.

### Phase 3: Student Proof Quality Sprint

Timeline: Days 46-65

Goal:

Improve supply quality based on recruiter feedback.

Actions:

- Convert recruiter comments into a student proof checklist.
- Identify 30 high-potential students.
- Ask each to improve one proof card.
- Review before/after with recruiters.
- Track what changes increase confidence.

Deliverable:

- Recruiter-ready proof card rubric.
- Student onboarding recommendations.
- Examples of strong vs weak proof.

Decision gate:

If students cannot produce stronger proof cards with simple guidance, onboarding and templates need redesign before scaling acquisition.

### Phase 4: Repeatable Buyer Loop

Timeline: Days 66-90

Goal:

Show repeat demand.

Actions:

- Ask initial recruiters to submit a second role or second candidate batch.
- Offer a paid pilot or letter of intent.
- Track recruiter willingness to pay for:
  - Curated candidate batch.
  - Recruiter workspace.
  - Access to proof passports.
  - Shortlist support.
- Capture testimonials around confidence, speed, and proof quality.

Deliverable:

- PMF scorecard.
- Pricing recommendation.
- Sales narrative.
- Product roadmap based on proven recruiter behavior.

Decision gate:

The next build cycle should be based on repeated recruiter behavior, not founder intuition.

## Interview Scripts

### Recruiter Interview

Goal: Learn whether Merit solves a painful screening problem.

Questions:

1. Tell me about the last intern or junior candidate you hired.
2. What made screening hard?
3. What signals did you trust?
4. What signals were useless?
5. Did you look at projects, portfolios, GitHub, Figma, decks, or case studies?
6. What did you wish was easier to evaluate?
7. If I gave you 10 candidates with structured proof of work, what would you want to see first?
8. What would make you distrust a candidate's proof?
9. How much time would this need to save before it was useful?
10. Would you review a curated batch for a real role this week?

Strong signal:

- They describe a recent painful hiring process.
- They already look for proof manually.
- They ask to see candidates.
- They say they would use it for a live role.

Weak signal:

- They speak generally about liking the idea.
- They have no active hiring need.
- They only care about school filters.
- They will not review candidates.

### Student Interview

Goal: Learn whether students can create recruiter-readable proof.

Questions:

1. What role are you trying to get?
2. What project best proves you can do that role?
3. What did you personally do?
4. What artifact can a recruiter inspect?
5. What skill does this project prove?
6. What result, user, grade, client, or outcome came from it?
7. What do you currently send recruiters?
8. What part of your work is hardest to explain?
9. Would you share a public proof passport?
10. What would make this feel worth maintaining?

Strong signal:

- They have real artifacts.
- They can explain their contribution.
- They want a more credible public identity.
- They care if recruiters actually look.

Weak signal:

- They only want a nicer profile.
- They cannot name a target role.
- They cannot identify proof.
- They do not want to share work publicly.

## Pricing Exploration

Do not price too early as a software subscription if the workflow is still concierge.

### Stage 1: Free Pilot

Offer:

- 1 real role.
- 10 curated candidates.
- Structured proof summaries.
- Review session.

Ask:

- Would this save you time?
- Would you use it again?
- What would you pay if the next batch was similarly useful?

### Stage 2: Paid Concierge Pilot

Potential pricing:

- SGD 99-299 per curated role batch for startups/SMEs.
- SGD 500-1,500 for a multi-role early talent pilot.
- Free for selected design partners in exchange for structured feedback and testimonial.

### Stage 3: Productized Recruiter Access

Potential pricing:

- Free browse tier.
- Paid recruiter workspace.
- Paid role matching.
- Paid candidate contact unlocks.
- Institution or cohort partnerships later.

The first commercial proof should be willingness to pay for higher-confidence shortlists, not raw database access.

## Product Implications

These are strategy implications only, not implementation instructions.

### Highest Priority Product Object

Proof Card.

Required recruiter-readable anatomy:

- Artifact.
- Candidate contribution.
- Skills demonstrated.
- Outcome.
- Role relevance.
- Confidence gaps.

### Highest Priority Buyer Surface

Recruiter review session / workspace.

Required recruiter-readable anatomy:

- Role requirements.
- Candidate shortlist.
- Proof preview.
- Match rationale.
- Missing evidence.
- Shortlist/contact action.

### Highest Priority Student Flow

Add strongest proof first.

Current onboarding should eventually shift from "complete your profile" to:

> What role do you want, and what work proves you can do it?

### Highest Priority Measurement

Recruiter confidence delta.

Ask before review:

> Based on resume/profile alone, how confident are you this candidate is worth interviewing?

Ask after proof review:

> After seeing structured proof, how confident are you?

## What Not To Build Yet

Do not prioritize:

- Full social feed mechanics.
- Heavy engagement metrics.
- Complex public discovery categories.
- Automated AI matching without manual validation.
- Enterprise ATS integrations.
- Institution dashboards.
- Broad student community features.
- Generic job board expansion.

These may matter later, but they distract from proving the buyer loop.

## PMF Scorecard

Run this after 90 days.

### Recruiter Pull

- 0: Recruiters like the idea but do not review candidates.
- 1: Recruiters review candidates when prompted.
- 2: Recruiters shortlist candidates from Merit.
- 3: Recruiters ask for more candidates or another role.
- 4: Recruiters pay or sign LOIs.
- 5: Recruiters change their screening workflow around Merit.

### Student Supply Quality

- 0: Students have weak or no artifacts.
- 1: Students upload projects but context is unclear.
- 2: Students can create readable proof cards with guidance.
- 3: Recruiters understand proof cards without explanation.
- 4: Students improve proof based on recruiter feedback.
- 5: Strong students join because recruiters are active.

### Marketplace Readiness

- 0: No repeatable loop.
- 1: Founder manually creates matches.
- 2: Manual matching produces recruiter shortlists.
- 3: Patterns emerge in proof signals and role fit.
- 4: Product can automate parts of proven workflow.
- 5: Supply and demand reinforce each other.

### PMF Threshold

Merit is not at PMF until:

- At least 10 recruiters complete review sessions.
- At least 5 recruiters return or request another batch.
- At least 3 recruiters pay, sign LOIs, or commit budget.
- At least 30% of curated candidates are shortlisted or contacted.
- Recruiters can state why Merit is better than resumes alone.

## Positioning For PMF Conversations

### Recruiter Pitch

> Merit helps you screen early-career candidates through structured proof of work, so you can see what they built, what skills it demonstrates, and whether it maps to your role before spending interview time.

### Student Pitch

> Merit turns your strongest work into a public proof passport recruiters can evaluate beyond your resume.

### Investor Pitch

> Merit is building the proof-of-ability layer for early-career hiring. The first PMF milestone is recruiter confidence: proving that structured student work helps hiring teams shortlist better candidates faster.

## Competitive Implications

Current market references show competitors are moving toward AI sourcing, large candidate pools, and workflow automation:

- LinkedIn emphasizes broad professional graph, hiring AI, skills signals, and workflow integrations.
- Handshake emphasizes early-talent scale, school-verified student data, filters, matches, campaigns, and ATS integrations.
- Wellfound Reach emphasizes AI sourcing agents, startup-intent candidates, enriched profiles, and automated outreach.
- Contra emphasizes independent work identity, portfolio-led discovery, contracts, payments, and flexible work management.
- Behance and Dribbble remain strong visual portfolio/community references, but their hiring signal is less structured across disciplines.

Merit should not fight on scale, automation, or network size first. It should fight on proof interpretation:

> The recruiter does not just find a candidate. The recruiter understands why the candidate is worth interviewing.

## PMF Narrative

The story to prove:

1. Early-career hiring has weak signal.
2. Students already have proof, but it is fragmented and hard to evaluate.
3. Recruiters already try to infer ability from scattered evidence.
4. Merit structures that evidence into proof cards and passports.
5. Recruiters can shortlist with more confidence.
6. Students with real ability get discovered earlier.

This is the category-defining version of Merit:

> Work becomes proof. Proof becomes signal. Signal creates opportunity.

## Source Notes

Internal sources reviewed:

- `README.md`
- `handoff.md`
- `brand/merit-brand-book.md`
- `brand/merit-v4-creative-direction.md`
- `brand/competitor-analysis.md`
- `brand/design-critique.md`
- current app source for discovery, project cards, profile/passport, and recruiter dashboard surfaces

External references reviewed:

- LinkedIn Recruiter / Talent Solutions: https://business.linkedin.com/talent-solutions/recruiter.html
- Handshake employer early-talent discovery: https://joinhandshake.com/employers/find-talent/
- Wellfound Reach: https://reach.wellfound.com/
- Behance discovery guide: https://help.behance.net/hc/en-us/articles/204484044-Guide-Discover-Creative-Work-on-Behance
- Contra work platform: https://contra.com/features/manage-freelance-projects

