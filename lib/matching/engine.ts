export type CandidateEvidence = {
  candidateUserId: string;
  skills: string[];
  projectCount: number;
  projectsWithImpact: number;
  projectsWithArtifacts: number;
};

export type MatchResult = {
  candidateUserId: string;
  score: number;
  reasons: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeSkills(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizeSkill)
        .filter((value) => value.length > 0)
    )
  );
}

export function calculateMatchScore(
  opportunitySkillsRaw: string[],
  candidate: CandidateEvidence
): MatchResult {
  const opportunitySkills = normalizeSkills(opportunitySkillsRaw);
  const candidateSkills = normalizeSkills(candidate.skills);

  const overlap = opportunitySkills.filter((skill) => candidateSkills.includes(skill));
  const overlapRatio = opportunitySkills.length > 0 ? overlap.length / opportunitySkills.length : 0;

  const overlapScore = overlapRatio * 65;
  const projectDepthScore = clamp(candidate.projectCount / 4, 0, 1) * 15;
  const impactScore = candidate.projectCount
    ? (candidate.projectsWithImpact / candidate.projectCount) * 10
    : 0;
  const evidenceScore = candidate.projectCount
    ? (candidate.projectsWithArtifacts / candidate.projectCount) * 10
    : 0;

  const rawScore = overlapScore + projectDepthScore + impactScore + evidenceScore;
  const score = Math.round(clamp(rawScore, 0, 100));

  const reasons: string[] = [];
  if (overlap.length > 0) {
    reasons.push(`Overlap skills: ${overlap.slice(0, 4).join(", ")}`);
  }
  if (candidate.projectCount > 0) {
    reasons.push(`${candidate.projectCount} project${candidate.projectCount === 1 ? "" : "s"} published`);
  }
  if (candidate.projectsWithImpact > 0) {
    reasons.push(`${candidate.projectsWithImpact} project${candidate.projectsWithImpact === 1 ? "" : "s"} with impact evidence`);
  }

  return {
    candidateUserId: candidate.candidateUserId,
    score,
    reasons
  };
}

export function rankCandidatesForOpportunity(
  opportunitySkills: string[],
  candidates: CandidateEvidence[],
  minimumScore = 20
): MatchResult[] {
  return candidates
    .map((candidate) => calculateMatchScore(opportunitySkills, candidate))
    .filter((result) => result.score >= minimumScore)
    .sort((a, b) => b.score - a.score);
}
