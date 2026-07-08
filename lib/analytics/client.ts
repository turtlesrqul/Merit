"use client";

import posthog from "posthog-js";
import type { AnalyticsProperties, MeritAnalyticsEventName } from "@/lib/analytics/events";

const ANONYMOUS_ID_STORAGE_KEY = "merit_analytics_anonymous_id";
const DEDUPE_STORAGE_PREFIX = "merit_analytics_dedupe:";

type TrackMeritEventOptions = {
  dedupeKey?: string;
  dedupeWindowMs?: number;
};

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

function shouldSkipForDedupe(dedupeKey: string | undefined, dedupeWindowMs: number | undefined) {
  if (!dedupeKey || !dedupeWindowMs || dedupeWindowMs <= 0) {
    return false;
  }

  try {
    const storageKey = `${DEDUPE_STORAGE_PREFIX}${dedupeKey}`;
    const lastSeenAt = Number(window.sessionStorage.getItem(storageKey));
    const now = Date.now();

    if (Number.isFinite(lastSeenAt) && now - lastSeenAt < dedupeWindowMs) {
      return true;
    }

    window.sessionStorage.setItem(storageKey, String(now));
  } catch {
    return false;
  }

  return false;
}

export function identifyAnalyticsUser(userId: string | null | undefined) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    return;
  }

  try {
    if (userId) {
      posthog.identify(userId);
      return;
    }
    posthog.reset();
  } catch {
    // Analytics must never interrupt a user flow.
  }
}

export function resetAnalyticsUser() {
  identifyAnalyticsUser(null);
}

export function trackMeritEvent(
  eventName: MeritAnalyticsEventName,
  properties: AnalyticsProperties = {},
  options: TrackMeritEventOptions = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  if (shouldSkipForDedupe(options.dedupeKey, options.dedupeWindowMs)) {
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
