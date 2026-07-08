export const PRODUCT_ANALYTICS_EVENT_NAMES = [
  "passport_created",
  "passport_updated",
  "project_added",
  "project_updated",
  "passport_link_copied",
  "passport_viewed",
  "profile_completed"
] as const;

const LEGACY_ANALYTICS_EVENT_NAMES = [
  "public_passport_viewed",
  "visitor_source_referrer_recorded",
  "public_passport_cta_clicked",
  "project_opened_viewed",
  "passport_link_copied_shared",
  "claim_link_copied"
] as const;

export const ANALYTICS_EVENT_NAMES = [
  ...PRODUCT_ANALYTICS_EVENT_NAMES,
  ...LEGACY_ANALYTICS_EVENT_NAMES
] as const;

export type MeritAnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsPropertyValue = string | number | boolean | null | undefined;

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

export const ALLOWED_ANALYTICS_EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES);
