import { describe, expect, it } from "vitest";
import { calculateProfileCompletionScore } from "@/lib/profile/completion-score";

describe("calculateProfileCompletionScore", () => {
  it("returns 0 when no profile fields are completed", () => {
    const score = calculateProfileCompletionScore({});
    expect(score).toBe(0);
  });

  it("returns 100 when all profile fields are completed", () => {
    const score = calculateProfileCompletionScore({
      name: "Avery",
      headline: "Software Engineer",
      bio: "I build product prototypes.",
      contactEmail: "avery@example.com",
      targetRoles: ["Frontend Intern"],
      portfolioLinks: ["https://github.com/avery"]
    });

    expect(score).toBe(100);
  });

  it("returns rounded percentage based on completed fields", () => {
    const score = calculateProfileCompletionScore({
      name: "Avery",
      headline: "Software Engineer",
      bio: "",
      contactEmail: "avery@example.com",
      targetRoles: [],
      portfolioLinks: ["https://github.com/avery"]
    });

    expect(score).toBe(67);
  });
});
