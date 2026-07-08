create table if not exists public.passport_views (
  id uuid primary key default gen_random_uuid(),
  passport_id text not null,
  viewer_user_id uuid references public.users(user_id) on delete set null,
  viewer_session_id text,
  owner_id uuid references public.users(user_id) on delete set null,
  viewed_at timestamptz not null default now(),
  referrer text,
  country text,
  city text,
  device text,
  browser text,
  created_at timestamptz not null default now(),
  constraint passport_views_passport_id_length check (char_length(passport_id) between 1 and 160),
  constraint passport_views_device_check check (
    device is null
    or device in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')
  )
);

create index if not exists passport_views_passport_viewed_at_idx
on public.passport_views (passport_id, viewed_at desc);

create index if not exists passport_views_owner_viewed_at_idx
on public.passport_views (owner_id, viewed_at desc)
where owner_id is not null;

create index if not exists passport_views_viewer_user_dedupe_idx
on public.passport_views (passport_id, viewer_user_id, viewed_at desc)
where viewer_user_id is not null;

create index if not exists passport_views_viewer_session_dedupe_idx
on public.passport_views (passport_id, viewer_session_id, viewed_at desc)
where viewer_session_id is not null;

revoke all on table public.passport_views from anon, authenticated;
grant select on table public.passport_views to authenticated;
grant select, insert on table public.passport_views to service_role;
grant select, insert on table public.analytics_events to service_role;

alter table public.passport_views enable row level security;

drop policy if exists passport_views_select_owner on public.passport_views;
create policy passport_views_select_owner on public.passport_views
for select
to authenticated
using ((select auth.uid()) = owner_id);
