# Screen-By-Screen Wireframes

## 1. Landing Page

Purpose: reposition Merit as proof-based hiring.  
User goal: choose student or recruiter path.  
Primary CTA: Build your passport.  
Secondary CTA: Review proof as recruiter.  
Key sections: hero product scene, proof problem, proof card example, recruiter workspace, student passport, final CTA.  
Layout: full-width editorial first viewport with product scene below headline; no split hero card.  
Content hierarchy: brand -> "Proven by work" -> proof-to-shortlist scene -> audience CTAs.  
Microcopy: "Merit turns student projects into recruiter-readable proof."  
Data needed: featured proof examples, support links.  
Interactions: CTA routing, preview proof card.  
Edge cases: unauthenticated users can browse limited preview.

## 2. Student Onboarding

Purpose: create first proof card.  
User goal: publish one proof object quickly.  
Primary CTA: Start proof card.  
Secondary CTA: Explore examples.  
Key sections: target role, strongest project, contribution, evidence, publish.  
Layout: stepper with live proof preview.  
Content hierarchy: role first, proof second, profile later.  
Microcopy: "Build your first proof card."  
Data needed: role options, project inputs, evidence files.  
Interactions: step progress, draft save, example picker.  
Edge cases: undecided role, no project yet, unverified email.

## 3. Student Dashboard

Purpose: manage proof readiness.  
User goal: improve passport.  
Primary CTA: Add or improve proof.  
Secondary CTA: View public passport.  
Key sections: strongest proof, evidence gaps, readiness, recent activity.  
Layout: top status band, main proof list, side readiness panel.  
Content hierarchy: next best action -> proof quality -> passport preview.  
Microcopy: "Your strongest proof is recruiter-readable."  
Data needed: proof cards, evidence levels, target role.  
Interactions: edit proof, preview passport, dismiss suggestions.  
Edge cases: no proof, broken evidence link, hidden project.

## 4. Project Proof Builder

Purpose: create structured evidence.  
User goal: make one project recruiter-readable.  
Primary CTA: Publish proof card.  
Secondary CTA: Save draft.  
Key sections: role targeted, contribution, evidence, skills, outcome, gaps.  
Layout: two-column form plus live card preview.  
Content hierarchy: claim -> evidence -> recruiter summary.  
Microcopy: "What did you personally own?"  
Data needed: project details, artifacts, skills, outcome.  
Interactions: upload, link preview, AI suggestions, evidence level update.  
Edge cases: upload failure, missing artifact, team contribution unclear.

## 5. Public Student Profile

Purpose: show candidate as proof passport.  
User goal: understand candidate credibility.  
Primary CTA: Contact candidate.  
Secondary CTA: Save or share.  
Key sections: identity, target role, strongest proof, evidence-backed skills, CV.  
Layout: dossier header, proof cards, side summary.  
Content hierarchy: target role -> strongest proof -> skills -> contact.  
Microcopy: "Skills backed by project evidence."  
Data needed: public profile, proof cards, artifacts.  
Interactions: open proof, copy link, contact.  
Edge cases: no contact email, private/unpublished proof.

## 6. Public Project Proof Page

Purpose: inspect one proof card deeply.  
User goal: evaluate one project.  
Primary CTA: View candidate passport.  
Secondary CTA: Open artifact.  
Key sections: artifact preview, proof summary, contribution, skills, outcome, gaps.  
Layout: large artifact left/top, evidence dossier right/below.  
Content hierarchy: artifact -> what it proves -> evidence quality.  
Microcopy: "Evidence found."  
Data needed: project, artifacts, skills, evidence level.  
Interactions: preview media, open external links.  
Edge cases: blocked iframe, missing preview, unsupported file.

## 7. Discovery Page

Purpose: browse proof, not profiles.  
User goal: find relevant work/candidates.  
Primary CTA: Inspect proof.  
Secondary CTA: Save.  
Key sections: filters, proof feed, candidate preview.  
Layout: filter rail plus proof-card grid/list hybrid.  
Content hierarchy: proof claim -> evidence -> candidate.  
Microcopy: "Search by what the work proves."  
Data needed: proof cards, skills, evidence levels.  
Interactions: filters, preview, save.  
Edge cases: no results, unauthenticated actions.

## 8. Recruiter Onboarding

Purpose: create first role brief.  
User goal: tell Merit what proof to search for.  
Primary CTA: Create role brief.  
Secondary CTA: See proof examples.  
Key sections: role, must-have skills, evidence preferences, constraints.  
Layout: focused wizard.  
Content hierarchy: role need -> proof signals -> review candidates.  
Microcopy: "What proof would make you want to interview someone?"  
Data needed: role brief fields.  
Interactions: skill autocomplete, evidence preference checkboxes.  
Edge cases: no active role, vague role, unsupported skill.

## 9. Recruiter Role Brief Creation

Purpose: define search context.  
User goal: generate relevant evidence results.  
Primary CTA: Search proof.  
Secondary CTA: Save draft.  
Key sections: title, description, skills, evidence preferences, location/availability.  
Layout: structured form with preview summary.  
Content hierarchy: must-haves before nice-to-haves.  
Microcopy: "Merit will search for proof, not just keywords."  
Data needed: role brief, recruiter account.  
Interactions: draft save, run match.  
Edge cases: no candidates match constraints.

## 10. Recruiter Search Results

Purpose: screen candidates.  
User goal: decide who merits deeper review.  
Primary CTA: View evidence.  
Secondary CTA: Save, compare.  
Key sections: role rail, result cards, evidence preview.  
Layout: three-panel workspace.  
Content hierarchy: candidate -> relevance -> proof -> gaps.  
Microcopy: "Why this candidate may be relevant."  
Data needed: role brief, candidate proofs, AI/rules summary.  
Interactions: select result, filter, save, compare.  
Edge cases: stale candidate, hidden proof, broken evidence link.

## 11. Candidate Evidence Profile

Purpose: inspect role-relevant candidate proof.  
User goal: shortlist or reject with confidence.  
Primary CTA: Shortlist.  
Secondary CTA: Contact, compare, save.  
Key sections: evidence summary, strongest proof, skills, gaps, notes.  
Layout: dossier with action rail.  
Content hierarchy: relevance summary -> proof -> gaps -> action.  
Microcopy: "Strong evidence match."  
Data needed: candidate profile, proof cards, recruiter state.  
Interactions: notes, shortlist, open proof.  
Edge cases: missing contact, low evidence level.

## 12. Candidate Comparison Page

Purpose: compare 2-4 candidates.  
User goal: choose interview shortlist.  
Primary CTA: Shortlist selected.  
Secondary CTA: Remove from compare.  
Key sections: comparison matrix, evidence details, notes.  
Layout: table/matrix, not cards.  
Content hierarchy: role fit -> strongest proof -> gaps.  
Microcopy: "Compare evidence, not profile polish."  
Data needed: selected candidates, proof summaries, notes.  
Interactions: reorder, note, shortlist.  
Edge cases: too many selected, candidate removed.

## 13. Shortlist Page

Purpose: manage interview-ready candidates.  
User goal: move candidates toward contact.  
Primary CTA: Contact candidate.  
Secondary CTA: Compare, archive.  
Key sections: shortlisted candidates, role grouping, notes, status.  
Layout: grouped list/table.  
Content hierarchy: status -> candidate -> proof reason.  
Microcopy: "Saved because..."  
Data needed: shortlist items, role brief, notes.  
Interactions: status change, contact, archive.  
Edge cases: duplicate candidate across roles.

## 14. Empty States

Purpose: guide next action.  
User goal: recover from no data.  
Primary CTAs:

- Student: Build first proof card.
- Recruiter: Create role brief.
- Discovery: Clear filters.

Layout: compact, action-led, no giant decorative cards.  
Microcopy: "No proof yet. Start with the work that best proves your target role."  
Data needed: user role, current surface.  
Interactions: route to first action.  
Edge cases: account mode mismatch.

## 15. Loading States

Purpose: keep workflows stable during fetch/match/upload.  
User goal: understand progress.  
Primary CTA: none unless cancellable.  
Layout: skeletons matching final layout dimensions.  
Microcopy: "Finding relevant proof..."  
Data needed: pending operation.  
Interactions: cancel upload where possible.  
Edge cases: slow match engine, upload timeout.

