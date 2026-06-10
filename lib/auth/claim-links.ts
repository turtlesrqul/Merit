const LOCALHOST_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

export const CLAIM_PASSPORT_ROUTE_PREFIX = "/claim/passport";

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeHostOrigin(host: string | null | undefined, protocol: string | null | undefined) {
  if (!host) {
    return null;
  }

  const normalizedProtocol = protocol?.trim().toLowerCase().replace(/:$/, "");
  const resolvedProtocol =
    normalizedProtocol === "http" || normalizedProtocol === "https"
      ? normalizedProtocol
      : LOCALHOST_HOST_PATTERN.test(host)
        ? "http"
        : "https";

  return normalizeBaseUrl(`${resolvedProtocol}://${host.trim()}`);
}

export function buildClaimPassportPath(token: string) {
  return `${CLAIM_PASSPORT_ROUTE_PREFIX}/${encodeURIComponent(token)}`;
}

export function buildClaimPassportUrl(token: string, baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? "http://localhost:3000";
  return `${normalizedBaseUrl}${buildClaimPassportPath(token)}`;
}

export function resolveClaimLinkBaseUrl({
  fallbackSiteUrl,
  fallbackViteSiteUrl,
  forwardedHost,
  forwardedProto,
  host,
  origin,
  referer
}: {
  fallbackSiteUrl?: string | null;
  fallbackViteSiteUrl?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  origin?: string | null;
  referer?: string | null;
}) {
  return (
    normalizeBaseUrl(origin) ??
    normalizeBaseUrl(referer) ??
    normalizeHostOrigin(forwardedHost, forwardedProto) ??
    normalizeHostOrigin(host, forwardedProto) ??
    normalizeBaseUrl(fallbackSiteUrl) ??
    normalizeBaseUrl(fallbackViteSiteUrl) ??
    "http://localhost:3000"
  );
}
