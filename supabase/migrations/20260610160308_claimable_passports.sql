create table if not exists public.unclaimed_passports (
  passport_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.users(user_id) on delete set null,
  created_by_admin_id uuid references public.users(user_id) on delete set null,
  full_name text not null,
  headline text,
  bio text,
  email text,
  school text,
  skills text[] not null default '{}'::text[],
  projects jsonb not null default '[]'::jsonb,
  featured_work jsonb,
  resume_url text,
  portfolio_url text,
  linkedin_url text,
  github_url text,
  passport_slug text,
  claim_token_hash text unique,
  claim_expires_at timestamptz not null default (now() + interval '3 days'),
  claimed_at timestamptz,
  status text not null default 'unclaimed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unclaimed_passports_status_check check (status in ('unclaimed', 'claimed', 'expired')),
  constraint unclaimed_passports_slug_format check (
    passport_slug is null
    or passport_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create unique index if not exists unclaimed_passports_passport_slug_key
on public.unclaimed_passports (passport_slug)
where passport_slug is not null;

create index if not exists unclaimed_passports_status_idx
on public.unclaimed_passports (status);

create index if not exists unclaimed_passports_claim_expires_at_idx
on public.unclaimed_passports (claim_expires_at);

drop trigger if exists unclaimed_passports_updated_at on public.unclaimed_passports;
create trigger unclaimed_passports_updated_at
before update on public.unclaimed_passports
for each row execute procedure public.touch_updated_at();

alter table public.unclaimed_passports enable row level security;
