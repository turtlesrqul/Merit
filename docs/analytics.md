# Merit Analytics

Merit uses PostHog for product analytics and Supabase for product-facing passport view history.

## How It Works

- Browser events call `trackMeritEvent()` in `lib/analytics/client.ts`.
- The browser helper posts one sanitized payload to `/api/analytics/events`.
- The API route enriches the payload with request context, forwards the event to PostHog with `posthog-node`, and stores a sanitized copy in `public.analytics_events`.
- Server-side creation/claim/admin events call `captureServerAnalyticsEvent()` directly and go to PostHog only.
- `passport_viewed` also inserts into `public.passport_views` for future in-product dashboards.
- PostHog client initialization lives in `instrumentation-client.ts`; automatic pageviews and autocapture are disabled so Merit only sends explicit product events.
- Auth sync identifies PostHog users by Supabase user id only. Merit does not send email addresses, IP addresses, or contact details as analytics properties.

Tracked product events:

- `passport_created`
- `passport_updated`
- `project_added`
- `project_updated`
- `passport_link_copied`
- `passport_viewed`
- `profile_completed`

## Environment Variables

Required for Supabase analytics storage:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Required for PostHog:

```bash
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Optional server-only override:

```bash
POSTHOG_PROJECT_API_KEY=
```

## Run Locally

1. Add the variables above to `.env.local`.
2. Apply Supabase migrations, including `supabase/migrations/202607080001_passport_views.sql`.
3. Start the app with `npm run dev`.
4. Open a public passport, copy a passport link, add/update a project, or update a profile.

## Verify Events

In PostHog, open the project linked to `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, then check **Activity** or **Product analytics > Events** for the event names above.

In Supabase, verify product-facing passport views with:

```sql
select passport_id, owner_id, viewer_user_id, viewer_session_id, viewed_at, referrer, country, city, device, browser
from public.passport_views
order by viewed_at desc
limit 20;
```

`passport_viewed` is deduped for rapid refreshes with a 60-second client/session window and a matching server-side recent-view check when Supabase is configured.
