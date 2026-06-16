import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

const ALLOWED_EVENT_NAMES = new Set([
  "public_passport_viewed",
  "visitor_source_referrer_recorded",
  "public_passport_cta_clicked",
  "project_opened_viewed",
  "passport_link_copied_shared",
  "claim_link_copied"
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnalyticsInsert = Database["public"]["Tables"]["analytics_events"]["Insert"];
type AnalyticsJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: AnalyticsJsonValue }
  | AnalyticsJsonValue[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

function safeUuid(value: unknown) {
  const text = safeString(value, 80);
  return text && UUID_PATTERN.test(text) ? text : null;
}

function sanitizeJson(value: unknown, depth = 0): AnalyticsJsonValue {
  if (depth > 4) {
    return null;
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (typeof value === "string") {
      return value.slice(0, 500);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return null;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeJson(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([key, entry]) => [key.slice(0, 80), sanitizeJson(entry, depth + 1)])
    );
  }
  return null;
}

function parseUrl(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function inferVisitorSource(referrer: string | null, urlValue: string | null) {
  const currentUrl = parseUrl(urlValue);
  const explicitSource = currentUrl?.searchParams.get("utm_source")?.trim();
  if (explicitSource) {
    return explicitSource.slice(0, 120);
  }

  const referrerUrl = parseUrl(referrer);
  if (!referrerUrl) {
    return "direct";
  }
  if (currentUrl && referrerUrl.hostname === currentUrl.hostname) {
    return "internal";
  }

  const hostname = referrerUrl.hostname.replace(/^www\./i, "").toLowerCase();
  if (/google|bing|duckduckgo|yahoo|baidu/.test(hostname)) {
    return "search";
  }
  if (/instagram|linkedin|twitter|x\.com|facebook|tiktok|reddit|threads/.test(hostname)) {
    return "social";
  }
  return "referral";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  const eventName = safeString(payload.eventName, 120);
  if (!eventName || !ALLOWED_EVENT_NAMES.has(eventName)) {
    return NextResponse.json({ error: "Unsupported analytics event." }, { status: 400 });
  }

  if (!getSupabaseEnvOrNull() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(null, { status: 204 });
  }

  const properties = isRecord(payload.properties) ? payload.properties : {};
  const url = safeString(payload.url, 1000);
  const referrer = safeString(payload.referrer, 1000);
  const path = safeString(payload.path, 300) ?? parseUrl(url)?.pathname ?? null;
  const source = inferVisitorSource(referrer, url);

  let userId: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  try {
    const adminClient = createAdminSupabaseClient();
    const insertPayload: AnalyticsInsert = {
      anonymous_id: safeString(payload.anonymousId, 120),
      claim_passport_id: safeUuid(properties.claim_passport_id),
      event_name: eventName,
      passport_user_id: safeUuid(properties.passport_user_id),
      path,
      project_id: safeUuid(properties.project_id),
      properties: sanitizeJson(properties) as AnalyticsInsert["properties"],
      referrer,
      source,
      url,
      user_agent: safeString(request.headers.get("user-agent"), 500),
      user_id: userId
    };

    const { error } = await adminClient.from("analytics_events").insert(insertPayload);
    if (error) {
      return new Response(null, { status: 204 });
    }
  } catch {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}
