const DEFAULT_SUPPORT_EMAIL = "hello@meritsg.com";
const DEFAULT_SUPPORT_URL = `mailto:${DEFAULT_SUPPORT_EMAIL}`;
const DEFAULT_SUPPORT_INSTAGRAM_HANDLE = "@ryan.fahrein";
const DEFAULT_SUPPORT_INSTAGRAM_URL = "https://instagram.com/ryan.fahrein";

export function getSupportEmail() {
  const value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && value.length > 0 ? value : DEFAULT_SUPPORT_EMAIL;
}

export function getSupportUrl() {
  const value = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim();
  if (value && value.length > 0) {
    return value;
  }
  return DEFAULT_SUPPORT_URL;
}

export function getSupportInstagramHandle() {
  const value = process.env.NEXT_PUBLIC_SUPPORT_INSTAGRAM_HANDLE?.trim();
  return value && value.length > 0 ? value : DEFAULT_SUPPORT_INSTAGRAM_HANDLE;
}

export function getSupportInstagramUrl() {
  const value = process.env.NEXT_PUBLIC_SUPPORT_INSTAGRAM_URL?.trim();
  if (value && value.length > 0) {
    return value;
  }
  return DEFAULT_SUPPORT_INSTAGRAM_URL;
}

function normalizePublicBaseUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return trimmed.replace(/\/+$/g, "");
  } catch {
    return null;
  }
}

export function getPublicAppUrl() {
  return (
    normalizePublicBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizePublicBaseUrl(process.env.NEXT_PUBLIC_SITE_URL)
  );
}
