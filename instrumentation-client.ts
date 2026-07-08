import posthog from "posthog-js";

const postHogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (typeof window !== "undefined" && postHogProjectToken) {
  posthog.init(postHogProjectToken, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,
    defaults: "2026-05-30",
    person_profiles: "identified_only"
  });
}
