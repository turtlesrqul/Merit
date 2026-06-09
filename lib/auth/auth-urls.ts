import { getPublicAppUrl } from "@/lib/public-config";

const PROD_FALLBACK_APP_URL = "https://meritsg.com";

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

export function resolveSignupEmailCallbackUrl() {
  return `${resolveAuthBaseUrl()}/auth/callback?next=/home&from=signup`;
}

export function resolvePasswordResetRedirectUrl() {
  return `${resolveAuthBaseUrl()}/reset-password`;
}
