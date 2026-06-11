import { getPublicAppUrl } from "@/lib/public-config";

const PROD_FALLBACK_APP_URL = "https://meritsg.com";

export function resolveSafeAuthNext(nextValue: string | null | undefined) {
  if (!nextValue || !nextValue.startsWith("/") || nextValue.startsWith("//")) {
    return "/home";
  }
  return nextValue;
}

export function buildAuthPath(path: "/sign-in" | "/sign-up", nextValue: string | null | undefined) {
  const nextPath = resolveSafeAuthNext(nextValue);
  if (nextPath === "/home") {
    return path;
  }
  return `${path}?next=${encodeURIComponent(nextPath)}`;
}

function resolveAuthBaseUrl() {
  const configuredBaseUrl = getPublicAppUrl();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";
    return isLocalhost ? window.location.origin : PROD_FALLBACK_APP_URL;
  }

  return PROD_FALLBACK_APP_URL;
}

export function resolveSignupEmailCallbackUrl(nextPath = "/home") {
  return `${resolveAuthBaseUrl()}/auth/callback?next=${encodeURIComponent(resolveSafeAuthNext(nextPath))}&from=signup`;
}

export function resolvePasswordResetRedirectUrl() {
  return `${resolveAuthBaseUrl()}/auth/callback?next=/reset-password`;
}
