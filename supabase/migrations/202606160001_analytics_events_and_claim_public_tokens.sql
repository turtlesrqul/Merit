create table if not exists public.analytics_events (
  event_id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references public.users(user_id) on delete set null,
  anonymous_id text,
  passport_user_id uuid references public.users(user_id) on delete set null,
  project_id uuid references public.projects(project_id) on delete set null,
  claim_passport_id uuid references public.unclaimed_passports(passport_id) on delete set null,
  source text,
  referrer text,
  path text,
  url text,
  user_agent text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_name_check check (event_name ~ '^[a-z0-9_]+$')
);

create index if not exists analytics_events_event_name_created_at_idx
on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_passport_user_created_at_idx
on public.analytics_events (passport_user_id, created_at desc)
where passport_user_id is not null;

create index if not exists analytics_events_project_created_at_idx
on public.analytics_events (project_id, created_at desc)
where project_id is not null;

create index if not exists analytics_events_claim_passport_created_at_idx
on public.analytics_events (claim_passport_id, created_at desc)
where claim_passport_id is not null;

alter table public.analytics_events enable row level security;

alter table public.unclaimed_passports
add column if not exists claim_public_token text;

create unique index if not exists unclaimed_passports_claim_public_token_key
on public.unclaimed_passports (claim_public_token)
where claim_public_token is not null;

update public.unclaimed_passports
set claim_public_token = gen_random_uuid()::text
where claim_public_token is null
  and status <> 'claimed';
