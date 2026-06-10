const DEFAULT_ADMIN_EMAILS = ["turtlesrqul@gmail.com"];

function parseBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

export function isCareerCoachEnabled() {
  return parseBooleanFlag(process.env.MERIT_FLAG_CAREER_COACH, false);
}

export function getAdminEmailAllowlist() {
  const raw = process.env.MERIT_ADMIN_EMAIL_ALLOWLIST ?? "";
  const configuredEmails = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...configuredEmails]));
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }
  return getAdminEmailAllowlist().includes(email.trim().toLowerCase());
}

export function isModerationEnabled() {
  return parseBooleanFlag(process.env.MERIT_FLAG_MODERATION, true);
}
