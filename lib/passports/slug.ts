const PASSPORT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_PASSPORT_SLUGS = new Set([
  "admin",
  "api",
  "claim",
  "dashboard",
  "edit",
  "home",
  "login",
  "new",
  "passport",
  "privacy",
  "profile",
  "projects",
  "search",
  "settings",
  "sign-in",
  "sign-up",
  "terms"
]);

export function normalizePassportSlugValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function generatePassportSlugFromName(name: string) {
  const normalized = normalizePassportSlugValue(name);
  if (!normalized) {
    return "student-passport";
  }
  if (normalized.length < 3 || RESERVED_PASSPORT_SLUGS.has(normalized)) {
    return `${normalized}-passport`;
  }
  return normalized;
}

export function validatePassportSlug(slug: string | null) {
  if (!slug) {
    return;
  }
  if (slug.length < 3 || slug.length > 80 || !PASSPORT_SLUG_PATTERN.test(slug)) {
    throw new Error("Passport path must be 3-80 lowercase letters, numbers, or hyphens.");
  }
  if (RESERVED_PASSPORT_SLUGS.has(slug)) {
    throw new Error(`"${slug}" is reserved. Choose a different public Passport path.`);
  }
}
