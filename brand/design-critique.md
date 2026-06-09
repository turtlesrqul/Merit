# Merit Design Critique

Date: 2026-06-02  
Mode: Professional design audit, not encouragement  
Scope: Brand, product surface, pitch deck, UI source, and current product direction  
Important: This document does not modify the app.

## Blunt Verdict

Merit has a legitimate, investable thesis and a real MVP direction. It is not merely "vibe coded." But it currently carries visible design debt, product-language drift, and trust gaps that make it feel founder-built in places.

The core idea is strong enough: proof over pedigree, student passports, project evidence, recruiter discovery, and match rationale. The current execution is not yet category-defining. It looks like a thoughtful MVP that has received a visual polish pass, but not yet a fully resolved brand/product system.

The biggest issue is not that the product is ugly. It is that the product sometimes cannot decide whether it is:

- a warm student project gallery,
- a public portfolio/passport product,
- a recruiter hiring workflow,
- an early-career marketplace,
- or an investor-grade proof infrastructure layer.

The winning version must be the last one, with enough humanity for students and enough clarity for recruiters.

## What Currently Works

### Core Thesis

"Proof over pedigree" works. It is short, defensible, memorable, and market-relevant. Do not replace it.

### Product Object

The passport concept works. It gives students a stronger object than "profile" and implies portability, identity, and readiness.

### Project-First Discovery

Discovery starting with work is correct. It prevents Merit from becoming another empty professional network.

### Cross-Discipline Ambition

The pitch deck correctly identifies that GitHub only solves proof for code, while students need a way to show design, business, research, documents, startups, and other work.

### Recruiter-Side Monetization

Free student passports plus paid recruiter access is the right business logic.

## What Is Weak

### The Visual System Is Softer Than The Business

The current cream/gold/gallery treatment gives the product taste, but it can make hiring feel like a curated student exhibition. Recruiters are not paying for a gallery. They are paying for clearer signal.

Severity: Major

Why it matters:

- Students may like it.
- Recruiters may see it as less operational.
- Investors may question whether the product is a workflow or a showcase.

### Too Many Generic Labels

The UI uses labels like Discovery, Profile, Add Project, Opportunities, Recruiter Dashboard, People. They are functional, but they do not consistently reinforce the proof thesis.

Severity: Major

Why it matters:

- Merit loses its own vocabulary.
- Users fall back into familiar categories: portfolio, job board, dashboard.
- Category creation becomes harder.

### The Proof Card Is Not Yet Sharp Enough

Project cards show artifacts and skills, but they need to answer the recruiter question faster:

- What did this person actually do?
- What does it prove?
- How strong is the evidence?
- Why is it relevant to my role?

Severity: Critical

Why it matters:

- This is the central product object.
- If proof cards are not obviously better than portfolio cards, Merit loses differentiation.

### Engagement Metrics Can Cheapen The Signal

Views, likes, and saves are useful internally, but showing them too prominently risks making Merit feel social. Recruiters do not primarily care whether a student project got likes. They care whether it proves role-relevant ability.

Severity: Major

Why it matters:

- Social metrics can bias evaluation.
- Low-engagement but high-quality work may look weak.
- Recruiter trust depends on evidence, not popularity.

### The Recruiter Experience Needs More Authority

The recruiter dashboard currently sounds functional: post roles, discover candidate proof profiles, run match engine. That is good MVP scope, but the surface needs to feel like a hiring intelligence tool.

Severity: Critical

Why it matters:

- Recruiters are the buyer.
- The business model depends on recruiter confidence.
- The current brand emphasis still feels more student/showcase-led.

### Pitch Deck Has Strong Logic But Needs Copy Polish

The deck has the right structure: market evidence, solution, differentiation, competition, market size, proof of concept, traction, business model. But it has visible text issues and awkward phrasing: "recruiter s," "Market" spacing, "Cross-Course" typography, inconsistent punctuation, and a few lines that read compressed or mechanically extracted.

Severity: Major

Why it matters:

- Investors notice polish gaps.
- Copy errors reduce perceived execution quality.
- The story is good enough that sloppy details are unnecessary self-harm.

## UX Evaluation

### Navigation

Current nav:

- Discovery
- People
- Profile
- Add Project
- Opportunities
- Recruiter

Problem:

The nav mixes user actions, places, and audiences. "Add Project" is an action, while "Discovery" and "People" are spaces. "Profile" conflicts with the stronger "Passport" concept.

Recommended direction:

- Discover
- Passports
- My Passport
- New Proof
- Opportunities
- Recruiter Workspace

Do not rename blindly in product yet, but the brand system should move in this direction.

### Onboarding

Current risk:

Students may create a profile before understanding what "good proof" looks like.

Better onboarding:

1. What role do you want to be discovered for?
2. Add the project that best proves it.
3. Add artifact.
4. Map skills to evidence.
5. Publish passport.

### Information Architecture

The current product has the right modules:

- Passport
- Projects
- Portfolio
- CV
- Activity
- Skills
- Saved

Problem:

These are not yet organized around a recruiter decision. "Portfolio" and "CV" are inputs. "Skills backed by project evidence" is closer to the real value and should be more central.

### Project Cards

Current strengths:

- Large previews.
- Skill tags.
- Author identity.
- Category labels.

Problems:

- Titles can dominate like editorial posters.
- "Hook" can be too vague.
- Engagement metrics appear as signal.
- Recruiter relevance is not explicit enough.

Recommended card hierarchy:

1. Artifact preview
2. What it proves
3. Project title
4. Candidate and target role
5. Skills backed by this project
6. Impact/outcome
7. Inspect proof / shortlist

### Student Profiles

Current strengths:

- Passport label.
- Readiness snapshot.
- Featured build.
- CV and portfolio support.

Problems:

- "Profile Studio" sounds internal and tool-like.
- Readiness score may feel arbitrary unless explained.
- Passport needs a stronger recruiter-view mode.

### Recruiter Experience

Current strengths:

- Post roles.
- Candidate discovery.
- Match engine.
- Matched candidates.

Problems:

- Recruiter workflow does not yet feel visually distinct enough from student surfaces.
- Match scores need rationale and caveats.
- Candidate comparison and shortlist flows should become central.

## Visual Design Evaluation

### Typography

Strength:

Serif headings give Merit a distinctive editorial feel.

Weakness:

Large serif card titles can make operational surfaces feel less precise. Dense product areas should lean harder on clean sans typography.

Severity: Major

### Color

Strength:

Gold/cream creates a recognizable warm identity.

Weakness:

The palette is too one-family. Beige/gold can feel soft, academic, and less technical. Merit needs sharper supporting colors for recruiter trust, fit, evidence, and completion.

Severity: Major

### Spacing and Layout

Strength:

The V3 pass clearly improved spacing and card polish.

Weakness:

Some card-heavy composition risks making pages feel like stacked UI panels rather than a purpose-built product. Recruiter surfaces need denser, more scannable layouts.

Severity: Minor to Major depending on surface.

### Hierarchy

Strength:

Discovery and passport hero sections create clear entry points.

Weakness:

The hierarchy often emphasizes presentation before evaluation. Recruiters need evidence hierarchy, not just visual hierarchy.

Severity: Major

### Premium Feel

Current state:

Merit feels more premium than a raw hackathon MVP, but not yet premium enough for "category-defining startup."

What blocks it:

- Copy inconsistencies.
- Generic labels.
- Over-soft palette.
- Lack of evidence-dense recruiter surfaces.
- Visible beta/product debt.

## Trust and Credibility

### Student Trust

Students will trust Merit if it helps their work look serious. The passport and proof framing do this well.

Concern:

If the product feels too recruiter-scored, students may feel judged or reduced.

### Recruiter Trust

Recruiters will trust Merit if proof is structured, comparable, and role-relevant.

Concern:

If the product feels like a student showcase, recruiters may not pay.

### Investor Trust

Investors will trust Merit if the product connects the thesis to monetizable recruiter behavior.

Concern:

Any deck or product polish issues undermine the "we can own hiring signal" story.

## Vibe Coded Question

### What Feels Professionally Designed

- The core thesis.
- The product module set.
- The V3 warm gallery pass.
- The passport metaphor.
- The recruiter-side match concept.
- The investor deck structure.

### What Feels Founder-Built

- Some naming and IA choices.
- Mixed brand vocabulary.
- Copy inconsistencies.
- The deck's typographic/text extraction errors.
- The current visual system relying heavily on warm cards and gold accents.

### What Feels Unfinished

- Recruiter evidence workflow.
- Proof card structure.
- Verification/trust language.
- Match rationale UX.
- Brand system documentation.
- Category-level landing narrative.

### What Feels Generic

- "Profile"
- "Dashboard"
- "Opportunities"
- "Discover talent"
- "Post roles"
- "Search users, projects, skills"

### What Feels Unique

- Proof over pedigree.
- Passport.
- Cross-course proof.
- Structured student proof.
- Early-career match rationale.

### What Might Cause Someone To Label It "Vibe Coded"

- A polished UI layer over still-evolving product logic.
- Warm editorial styling that may not map perfectly to recruiter workflows.
- Generic SaaS labels next to ambitious category language.
- Visible deck copy errors.
- Engagement/social elements mixed with hiring evaluation.

### Is Merit Actually Vibe Coded?

No. Merit is a legitimate MVP with design debt.

Reason:

The product has a coherent thesis, implemented flows, database-backed functionality, public profiles, project CRUD, discovery, recruiter opportunities, match scores, and a monetization direction. That is not just aesthetic improvisation.

But it does have the kind of design debt that makes a product feel founder-built:

- Brand language is not fully systematized.
- Recruiter trust is not yet visually dominant.
- The core proof object needs sharper hierarchy.
- The deck and product copy need professional polish.

So the honest answer is:

> Merit is not vibe coded. It is a real MVP that still looks and talks like an MVP in places.

## First Impression Test

### 1. Recruiter

First impression:

"Interesting. I can see projects, but I need to know whether this saves me screening time."

Confidence level:

Medium.

Trust level:

Medium-low until evidence quality and match rationale are clear.

Biggest concern:

Is this another student portfolio site?

Biggest positive:

Proof cards and passports could make early screening more useful.

### 2. Investor

First impression:

"The thesis is strong and the Singapore wedge is concrete. Execution polish needs work."

Confidence level:

Medium.

Trust level:

Medium.

Biggest concern:

Can recruiter demand become repeatable paid behavior?

Biggest positive:

Proof over pedigree is a clear, marketable belief with platform potential.

### 3. Startup Accelerator Reviewer

First impression:

"Clear problem, sensible MVP, two-sided marketplace, early traction. Needs sharper differentiation and proof of recruiter pull."

Confidence level:

Medium-high for concept, medium for execution.

Trust level:

Medium.

Biggest concern:

Too many adjacent platforms already exist.

Biggest positive:

The product has a focused early-career wedge and visible shipped scope.

### 4. Senior Product Designer

First impression:

"Good thesis, decent visual pass, but the information architecture and proof hierarchy are not finished."

Confidence level:

Medium.

Trust level:

Medium-low.

Biggest concern:

The visual direction is tasteful but not yet perfectly matched to the product strategy.

Biggest positive:

The passport/proof card system could become a strong design language.

### 5. Student

First impression:

"This could make my projects look more official."

Confidence level:

Medium-high if onboarding is simple.

Trust level:

Medium.

Biggest concern:

Will recruiters actually look at this?

Biggest positive:

It gives their work a place to matter.

## Scores

### Visual Design: 6.5 / 10

The current warm gallery direction is competent and more polished than a raw MVP. It has taste. But it is too soft and one-note for the recruiter/infrastructure ambition. It needs sharper evidence hierarchy, stronger contrast, and less beige/gold dependency.

### UX: 6 / 10

The main flows exist, but the hierarchy is not yet optimized around the core decision: evaluating proof. Navigation and labels are functional but not ownable. Recruiter workflows need more density and authority.

### Brand: 7 / 10

"Proof over pedigree" is excellent. Passport is strong. The broader brand system is underdeveloped. There is not yet a full voice, naming, visual, and messaging system that consistently supports the thesis.

### Trust: 5.5 / 10

Trust is the weakest strategic dimension. The product can feel credible, but hiring decisions require more than nice cards. Merit needs clearer verification posture, evidence structure, match rationale, and copy polish.

### Student Appeal: 7.5 / 10

Students are likely to understand the value quickly. The platform gives their work dignity and visibility. The risk is onboarding friction and uncertainty about whether recruiters will actually engage.

### Recruiter Appeal: 6 / 10

Recruiters will like the concept but need stronger proof that it saves time and improves shortlisting. The recruiter experience should become more operational, evidence-dense, and outcome-oriented.

### Differentiation: 7 / 10

The strategic differentiation is strong. The product differentiation is not yet fully expressed. Merit must make "structured proof" visible in the product, not just the pitch.

### Product Maturity: 6 / 10

This is a real MVP with meaningful scope. It is not mature yet. There is visible design debt, product vocabulary drift, and likely edge-case roughness.

### Investor Readiness: 6.5 / 10

The market story is promising and the deck structure is right. The polish, copy, and business proof need tightening. The investor version needs stronger recruiter pull metrics.

### Accelerator Readiness: 7 / 10

Merit is accelerator-ready as a concept/MVP. It has a clear problem, market wedge, early traction, and product scope. It needs a sharper 90-day focus and better proof of repeatable demand.

## Severity-Based Issues

### Critical: Proof Card Is Not Yet The Category Object

Problem:

The project/proof card does not yet consistently show what the work proves and why a recruiter should care.

Why users perceive it:

Students see a place to upload projects. Recruiters see attractive cards but may still have to infer too much.

How recruiters perceive it:

"I still need to do the evaluation work myself."

How investors perceive it:

"Where is the defensible workflow?"

Fix:

Redesign the mental model around proof anatomy: artifact, role, skill, evidence, outcome, fit.

### Critical: Recruiter Workflow Does Not Yet Feel Like The Buyer Product

Problem:

Recruiter functionality exists, but the brand and UI still feel student/showcase-led.

Why users perceive it:

The warm gallery direction and project-first feed dominate the product impression.

How recruiters perceive it:

"Useful, maybe, but not obviously a must-have hiring tool."

How investors perceive it:

"Can this monetize?"

Fix:

Build recruiter surfaces around screening confidence, match rationale, shortlist workflow, and proof comparison.

### Major: Visual System Is Too Warm And Narrow

Problem:

Cream/gold/serif creates a pleasant identity but not enough precision.

Why users perceive it:

It feels polished, but soft.

How recruiters perceive it:

"Nice showcase."

How investors perceive it:

"Does this have enterprise potential?"

Fix:

Add sharper neutrals, proof blue, evidence green, denser UI structures, and stricter typography roles.

### Major: Copy Is Not Professional Enough Everywhere

Problem:

The deck has copy issues. The app has generic labels. The brand vocabulary is not consistent.

Why users perceive it:

Small copy issues create disproportionate doubt in a trust product.

How recruiters perceive it:

"Is this ready for serious hiring?"

How investors perceive it:

"Execution quality needs tightening."

Fix:

Run a full copy pass across deck, landing, nav, project cards, passport, and recruiter dashboard.

### Major: Engagement Signals Confuse Evaluation Signals

Problem:

Views, likes, and saves are visible in card metadata.

Why users perceive it:

It makes Merit feel social.

How recruiters perceive it:

"Am I evaluating popularity or ability?"

How investors perceive it:

"Is this a network, marketplace, or hiring tool?"

Fix:

Demote engagement metrics and promote evidence/fit metrics.

## What To Keep

- Proof over pedigree.
- Passport.
- Project-first discovery.
- Real artifacts.
- Cross-discipline proof.
- Recruiter-side monetization.
- Explainable match direction.
- Singapore beachhead.

## What To Improve

- Proof card hierarchy.
- Recruiter workspace.
- Match rationale.
- Brand vocabulary.
- Visual contrast.
- Deck copy.
- Trust language.
- Onboarding around strongest proof.

## What To Remove

- Overuse of generic profile/dashboard language.
- Social-metric prominence.
- Excess warm decorative treatment.
- Any implication of verification that is not supported.
- Redundant cards and soft hero panels where dense workflow would serve better.

## 90-Day Focus

Single design and branding focus:

> Turn the Proof Card and Merit Passport into unmistakably credible hiring objects.

Single product focus:

> Prove recruiter confidence improves after reviewing structured student proof.

Measure:

- Recruiter review completion.
- Shortlist conversion.
- Confidence score before/after Merit review.
- Time to identify candidates.
- Percentage of candidates with at least one strong proof card.

## Final Recommendation

Merit can become category-defining if it stops presenting proof as merely beautiful student work and starts presenting it as structured hiring evidence.

The product should make one thing obvious within 30 seconds:

> This candidate is not just claiming ability. Merit shows the work, the context, the skills, and the fit.

That is the difference between another portfolio platform and a proof-of-ability infrastructure company.

