import { describe, expect, it } from "vitest";
import {
  calculateMatchScore,
  rankCandidatesForOpportunity,
  type CandidateEvidence
} from "@/lib/matching/engine";

describe("matching engine", () => {
  const candidate: CandidateEvidence = {
    candidateUserId: "user-1",
    skills: ["react", "typescript", "sql"],
    projectCount: 3,
    projectsWithImpact: 2,
    projectsWithArtifacts: 3
  };

  it("produces a higher score when skill overlap is strong", () => {
    const strong = calculateMatchScore(["react", "sql"], candidate);
    const weak = calculateMatchScore(["android", "kotlin"], candidate);
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("ranks candidates and filters low scores", () => {
    const candidates: CandidateEvidence[] = [
      candidate,
      {
        candidateUserId: "user-2",
        skills: ["android"],
        projectCount: 1,
        projectsWithImpact: 0,
        projectsWithArtifacts: 0
      }
    ];

    const ranked = rankCandidatesForOpportunity(["react", "typescript"], candidates, 20);
    expect(ranked.length).toBe(1);
    expect(ranked[0].candidateUserId).toBe("user-1");
  });
});
