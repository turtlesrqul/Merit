"use client";

export type MeritAnalyticsEventName =
  | "public_passport_viewed"
  | "visitor_source_referrer_recorded"
  | "public_passport_cta_clicked"
  | "project_opened_viewed"
  | "passport_link_copied_shared"
  | "claim_link_copied";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const ANONYMOUS_ID_STORAGE_KEY = "merit_analytics_anonymous_id";

function createAnonymousId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function getAnonymousId() {
  try {
    const existingId = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
    if (existingId) {
      return existingId;
    }
    const nextId = createAnonymousId();
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return null;
  }
}

export function trackMeritEvent(
  eventName: MeritAnalyticsEventName,
  properties: AnalyticsProperties = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify({
    eventName,
    properties,
    anonymousId: getAnonymousId(),
    path: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/analytics/events", blob)) {
      return;
    }
  }

  void fetch("/api/analytics/events", {
    body: payload,
    headers: {
      "content-type": "application/json"
    },
    keepalive: true,
    method: "POST"
  }).catch(() => {
    // Analytics must never interrupt a user flow.
  });
}
