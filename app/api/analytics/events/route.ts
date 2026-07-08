import { NextResponse } from "next/server";
import {
  ALLOWED_ANALYTICS_EVENT_NAMES,
  type MeritAnalyticsEventName
} from "@/lib/analytics/events";
import { captureServerAnalyticsEvent } from "@/lib/analytics/posthog-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const PASSPORT_VIEW_DEDUPE_WINDOW_MS = 60_000;

type AnalyticsInsert = Database["public"]["Tables"]["analytics_events"]["Insert"];
type PassportViewInsert = Database["public"]["Tables"]["passport_views"]["Insert"];
type AdminClient = ReturnType<typeof createAdminSupabaseClient>;
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

function safeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function safeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstProperty(properties: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (properties[key] !== undefined && properties[key] !== null) {
      return properties[key];
    }
  }
  return null;
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

function toIsoTimestamp(value: unknown) {
  const text = safeString(value, 80);
  if (text) {
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

function inferDevice(userAgent: string | null) {
  const value = userAgent?.toLowerCase() ?? "";
  if (!value) {
    return "unknown";
  }
  if (/bot|crawler|spider|crawling/.test(value)) {
    return "bot";
  }
  if (/ipad|tablet|kindle|silk/.test(value)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android/.test(value)) {
    return "mobile";
  }
  return "desktop";
}

function inferBrowser(userAgent: string | null) {
  const value = userAgent ?? "";
  if (!value) {
    return "unknown";
  }
  if (/Edg\//.test(value)) {
    return "Edge";
  }
  if (/OPR\//.test(value)) {
    return "Opera";
  }
  if (/Chrome\//.test(value) && !/Chromium\//.test(value)) {
    return "Chrome";
  }
  if (/Firefox\//.test(value)) {
    return "Firefox";
  }
  if (/Safari\//.test(value) && /Version\//.test(value)) {
    return "Safari";
  }
  return "Other";
}

function decodeHeaderValue(value: string | null) {
  const safeValue = safeString(value, 120);
  if (!safeValue) {
    return null;
  }

  try {
    return decodeURIComponent(safeValue);
  } catch {
    return safeValue;
  }
}

function getRequestGeo(headers: Headers) {
  return {
    city: decodeHeaderValue(headers.get("x-vercel-ip-city")),
    country: safeString(headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"), 80)
  };
}

function isMissingTableError(errorMessage: string, tableName: string) {
  const message = errorMessage.toLowerCase();
  const bareTable = tableName.toLowerCase();
  const publicTable = `public.${bareTable}`;
  return (
    message.includes(`relation "${bareTable}" does not exist`) ||
    message.includes(`relation '${bareTable}' does not exist`) ||
    message.includes(`relation "${publicTable}" does not exist`) ||
    message.includes(`relation '${publicTable}' does not exist`) ||
    (message.includes("schema cache") &&
      (message.includes(`'${bareTable}'`) ||
        message.includes(`"${bareTable}"`) ||
        message.includes(`'${publicTable}'`) ||
        message.includes(`"${publicTable}"`)))
  );
}

function getNormalizedIds(properties: Record<string, unknown>) {
  const ownerId = safeUuid(
    firstProperty(properties, ["ownerId", "owner_id", "passportOwnerId", "passport_user_id"])
  );
  const passportUserId = safeUuid(
    firstProperty(properties, ["passportUserId", "passport_user_id", "ownerId", "owner_id"])
  );
  const passportId =
    safeString(firstProperty(properties, ["passportId", "passport_id"]), 160) ??
    passportUserId;
  const projectId = safeUuid(firstProperty(properties, ["projectId", "project_id"]));
  const claimPassportId = safeUuid(firstProperty(properties, ["claimPassportId", "claim_passport_id"]));

  return {
    claimPassportId,
    ownerId,
    passportId,
    passportUserId: passportUserId ?? ownerId,
    projectId
  };
}

async function getAuthenticatedUserId() {
  if (!getSupabaseEnvOrNull()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function getAdminClient() {
  if (!getSupabaseEnvOrNull() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    return createAdminSupabaseClient();
  } catch {
    return null;
  }
}

async function isRecentPassportView(
  adminClient: AdminClient,
  passportId: string,
  viewerUserId: string | null,
  viewerSessionId: string | null,
  viewedAt: string
) {
  if (!viewerUserId && !viewerSessionId) {
    return false;
  }

  const since = new Date(
    new Date(viewedAt).getTime() - PASSPORT_VIEW_DEDUPE_WINDOW_MS
  ).toISOString();
  let query = adminClient
    .from("passport_views")
    .select("id")
    .eq("passport_id", passportId)
    .gte("viewed_at", since)
    .limit(1);

  if (viewerUserId) {
    query = query.eq("viewer_user_id", viewerUserId);
  } else if (viewerSessionId) {
    query = query.eq("viewer_session_id", viewerSessionId);
  }

  const { data, error } = await query;
  if (error) {
    return false;
  }

  return (data ?? []).length > 0;
}

async function insertPassportView(options: {
  adminClient: AdminClient;
  browser: string;
  city: string | null;
  country: string | null;
  device: string;
  ownerId: string | null;
  passportId: string | null;
  referrer: string | null;
  viewedAt: string;
  viewerSessionId: string | null;
  viewerUserId: string | null;
}) {
  const { adminClient, passportId, viewerSessionId, viewerUserId, viewedAt } = options;
  if (!passportId) {
    return { duplicate: false };
  }

  const duplicate = await isRecentPassportView(
    adminClient,
    passportId,
    viewerUserId,
    viewerSessionId,
    viewedAt
  );
  if (duplicate) {
    return { duplicate: true };
  }

  const insertPayload: PassportViewInsert = {
    browser: options.browser,
    city: options.city,
    country: options.country,
    device: options.device,
    owner_id: options.ownerId,
    passport_id: passportId,
    referrer: options.referrer,
    viewed_at: viewedAt,
    viewer_session_id: viewerSessionId,
    viewer_user_id: viewerUserId
  };

  const { error } = await adminClient.from("passport_views").insert(insertPayload);
  if (error && !isMissingTableError(error.message, "passport_views")) {
    return { duplicate: false };
  }

  return { duplicate: false };
}

async function insertAnalyticsEvent(options: {
  adminClient: AdminClient;
  anonymousId: string | null;
  claimPassportId: string | null;
  eventName: MeritAnalyticsEventName;
  passportUserId: string | null;
  path: string | null;
  projectId: string | null;
  properties: Record<string, unknown>;
  referrer: string | null;
  source: string;
  url: string | null;
  userAgent: string | null;
  userId: string | null;
}) {
  const insertPayload: AnalyticsInsert = {
    anonymous_id: options.anonymousId,
    claim_passport_id: options.claimPassportId,
    event_name: options.eventName,
    passport_user_id: options.passportUserId,
    path: options.path,
    project_id: options.projectId,
    properties: sanitizeJson(options.properties) as AnalyticsInsert["properties"],
    referrer: options.referrer,
    source: options.source,
    url: options.url,
    user_agent: safeString(options.userAgent, 500),
    user_id: options.userId
  };

  const { error } = await options.adminClient.from("analytics_events").insert(insertPayload);
  if (error) {
    return;
  }
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

  const eventName = safeString(payload.eventName, 120) as MeritAnalyticsEventName | null;
  if (!eventName || !ALLOWED_ANALYTICS_EVENT_NAMES.has(eventName)) {
    return NextResponse.json({ error: "Unsupported analytics event." }, { status: 400 });
  }

  const rawProperties = isRecord(payload.properties) ? payload.properties : {};
  const url = safeString(payload.url, 1000);
  const referrer = safeString(payload.referrer, 1000);
  const path = safeString(payload.path, 300) ?? parseUrl(url)?.pathname ?? null;
  const source = inferVisitorSource(referrer, url);
  const userAgent = request.headers.get("user-agent");
  const device = inferDevice(userAgent);
  const browser = inferBrowser(userAgent);
  const { city, country } = getRequestGeo(request.headers);
  const timestamp = toIsoTimestamp(firstProperty(rawProperties, ["timestamp", "viewedAt", "viewed_at"]));
  const anonymousId = safeString(payload.anonymousId, 120);
  const userId = await getAuthenticatedUserId();
  const isLoggedIn = Boolean(userId);
  const ids = getNormalizedIds(rawProperties);
  const isOwner =
    safeBoolean(firstProperty(rawProperties, ["isOwner", "is_owner"])) ??
    Boolean(userId && ids.ownerId && userId === ids.ownerId);
  const profileCompletionPercentage = safeNumber(
    firstProperty(rawProperties, ["profileCompletionPercentage", "profile_completion_percentage"])
  );
  const contextProperties: Record<string, unknown> = {
    ...rawProperties,
    $current_url: url,
    $pathname: path,
    $referrer: referrer,
    browser,
    city,
    country,
    device,
    isLoggedIn,
    isOwner,
    ownerId: ids.ownerId,
    passportId: ids.passportId,
    path,
    profileCompletionPercentage,
    projectId: ids.projectId,
    referrer,
    source,
    timestamp,
    url,
    userId
  };

  const adminClient = getAdminClient();
  if (adminClient && eventName === "passport_viewed") {
    const { duplicate } = await insertPassportView({
      adminClient,
      browser,
      city,
      country,
      device,
      ownerId: ids.ownerId,
      passportId: ids.passportId,
      referrer,
      viewedAt: timestamp,
      viewerSessionId: anonymousId,
      viewerUserId: userId
    });

    if (duplicate) {
      return new Response(null, { status: 204 });
    }
  }

  if (adminClient) {
    await insertAnalyticsEvent({
      adminClient,
      anonymousId,
      claimPassportId: ids.claimPassportId,
      eventName,
      passportUserId: ids.passportUserId,
      path,
      projectId: ids.projectId,
      properties: contextProperties,
      referrer,
      source,
      url,
      userAgent,
      userId
    });
  }

  await captureServerAnalyticsEvent(eventName, userId ?? anonymousId, contextProperties);

  return new Response(null, { status: 204 });
}
