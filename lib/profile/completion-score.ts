export type ProfileCompletionInput = {
  name?: string | null;
  headline?: string | null;
  bio?: string | null;
  contactEmail?: string | null;
  portfolioLinks?: string[] | null;
  targetRoles?: string[] | null;
};

export function calculateProfileCompletionScore(
  input: ProfileCompletionInput
): number {
  const checks = [
    Boolean(input.name?.trim()),
    Boolean(input.headline?.trim()),
    Boolean(input.bio?.trim()),
    Boolean(input.contactEmail?.trim()),
    Boolean(input.targetRoles && input.targetRoles.length > 0),
    Boolean(
      input.portfolioLinks?.some((link) => typeof link === "string" && link.trim().length > 0)
    )
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}
