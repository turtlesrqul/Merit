import "server-only";

import { PostHog } from "posthog-node";
import type { MeritAnalyticsEventName } from "@/lib/analytics/events";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function getPostHogProjectToken() {
  return (
    process.env.POSTHOG_PROJECT_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
    null
  );
}

function getPostHogHost() {
  const value = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  return value && value.length > 0 ? value : DEFAULT_POSTHOG_HOST;
}

export async function captureServerAnalyticsEvent(
  eventName: MeritAnalyticsEventName,
  distinctId: string | null | undefined,
  properties: Record<string, unknown> = {}
) {
  const projectToken = getPostHogProjectToken();
  const resolvedDistinctId = distinctId?.trim();

  if (!projectToken || !resolvedDistinctId) {
    return;
  }

  const posthog = new PostHog(projectToken, {
    flushAt: 1,
    flushInterval: 0,
    host: getPostHogHost()
  });

  try {
    posthog.capture({
      distinctId: resolvedDistinctId,
      event: eventName,
      properties: {
        ...properties,
        timestamp:
          typeof properties.timestamp === "string" || typeof properties.timestamp === "number"
            ? properties.timestamp
            : new Date().toISOString()
      }
    });
  } catch {
    // Analytics must never interrupt product flows.
  } finally {
    try {
      await posthog.shutdown();
    } catch {
      // Ignore transient analytics delivery failures.
    }
  }
}
