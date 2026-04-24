create extension if not exists "pgcrypto";

create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique not null,
  headline text,
  role_type text check (role_type in ('candidate', 'recruiter')),
  target_roles text[] default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.candidate_profiles (
  profile_id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(user_id) on delete cascade,
  bio text,
  contact_email text,
  portfolio_links text[] default '{}'::text[],
  profile_completion_score int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  project_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  title text not null,
  problem_solved text not null,
  what_was_built text not null,
  category text not null,
  impact text,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_tags (
  skill_id uuid primary key default gen_random_uuid(),
  skill_name text unique not null
);

create table if not exists public.project_skills (
  project_id uuid not null references public.projects(project_id) on delete cascade,
  skill_id uuid not null references public.skill_tags(skill_id) on delete cascade,
  primary key (project_id, skill_id)
);

create table if not exists public.artifacts (
  artifact_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(project_id) on delete cascade,
  artifact_type text not null,
  artifact_url text not null,
  preview_url text
);

create table if not exists public.saved_projects (
  user_id uuid not null references public.users(user_id) on delete cascade,
  project_id uuid not null references public.projects(project_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table if not exists public.inspired_projects (
  user_id uuid not null references public.users(user_id) on delete cascade,
  project_id uuid not null references public.projects(project_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table if not exists public.opportunities (
  opportunity_id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.users(user_id) on delete cascade,
  title text not null,
  company text not null,
  description text not null,
  skills_sought text[] default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  match_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(opportunity_id) on delete cascade,
  match_score numeric(5,2) not null,
  match_rationale text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidate_profiles_updated_at on public.candidate_profiles;
create trigger candidate_profiles_updated_at
before update on public.candidate_profiles
for each row execute procedure public.touch_updated_at();

alter table public.users enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.skill_tags enable row level security;
alter table public.project_skills enable row level security;
alter table public.artifacts enable row level security;
alter table public.saved_projects enable row level security;
alter table public.inspired_projects enable row level security;
alter table public.opportunities enable row level security;
alter table public.matches enable row level security;

drop policy if exists users_select on public.users;
create policy users_select on public.users
for select using (true);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
for insert with check (auth.uid() = user_id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_profiles_select on public.candidate_profiles;
create policy candidate_profiles_select on public.candidate_profiles
for select using (true);

drop policy if exists candidate_profiles_insert_own on public.candidate_profiles;
create policy candidate_profiles_insert_own on public.candidate_profiles
for insert with check (auth.uid() = user_id);

drop policy if exists candidate_profiles_update_own on public.candidate_profiles;
create policy candidate_profiles_update_own on public.candidate_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
for select using (true);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
for insert with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects
for delete using (auth.uid() = user_id);

drop policy if exists skill_tags_select on public.skill_tags;
create policy skill_tags_select on public.skill_tags
for select using (true);

drop policy if exists skill_tags_insert_authenticated on public.skill_tags;
create policy skill_tags_insert_authenticated on public.skill_tags
for insert with check (auth.role() = 'authenticated');

drop policy if exists project_skills_select on public.project_skills;
create policy project_skills_select on public.project_skills
for select using (true);

drop policy if exists project_skills_manage_own on public.project_skills;
create policy project_skills_manage_own on public.project_skills
for all using (
  exists (
    select 1
    from public.projects p
    where p.project_id = project_skills.project_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.project_id = project_skills.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists artifacts_select on public.artifacts;
create policy artifacts_select on public.artifacts
for select using (true);

drop policy if exists artifacts_manage_own on public.artifacts;
create policy artifacts_manage_own on public.artifacts
for all using (
  exists (
    select 1
    from public.projects p
    where p.project_id = artifacts.project_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.project_id = artifacts.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists saved_projects_select_own on public.saved_projects;
create policy saved_projects_select_own on public.saved_projects
for select using (auth.uid() = user_id);

drop policy if exists saved_projects_insert_own on public.saved_projects;
create policy saved_projects_insert_own on public.saved_projects
for insert with check (auth.uid() = user_id);

drop policy if exists saved_projects_delete_own on public.saved_projects;
create policy saved_projects_delete_own on public.saved_projects
for delete using (auth.uid() = user_id);

drop policy if exists inspired_projects_select_own on public.inspired_projects;
create policy inspired_projects_select_own on public.inspired_projects
for select using (auth.uid() = user_id);

drop policy if exists inspired_projects_insert_own on public.inspired_projects;
create policy inspired_projects_insert_own on public.inspired_projects
for insert with check (auth.uid() = user_id);

drop policy if exists inspired_projects_delete_own on public.inspired_projects;
create policy inspired_projects_delete_own on public.inspired_projects
for delete using (auth.uid() = user_id);

drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
for select using (true);

drop policy if exists opportunities_manage_own on public.opportunities;
create policy opportunities_manage_own on public.opportunities
for all using (auth.uid() = recruiter_id) with check (auth.uid() = recruiter_id);

drop policy if exists matches_select_own on public.matches;
create policy matches_select_own on public.matches
for select using (auth.uid() = user_id);

drop policy if exists matches_select_recruiter on public.matches;
create policy matches_select_recruiter on public.matches
for select using (
  exists (
    select 1
    from public.opportunities o
    where o.opportunity_id = matches.opportunity_id
      and o.recruiter_id = auth.uid()
  )
);

drop policy if exists matches_insert_recruiter on public.matches;
create policy matches_insert_recruiter on public.matches
for insert with check (
  exists (
    select 1
    from public.opportunities o
    where o.opportunity_id = matches.opportunity_id
      and o.recruiter_id = auth.uid()
  )
);

drop policy if exists matches_update_recruiter on public.matches;
create policy matches_update_recruiter on public.matches
for update using (
  exists (
    select 1
    from public.opportunities o
    where o.opportunity_id = matches.opportunity_id
      and o.recruiter_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.opportunities o
    where o.opportunity_id = matches.opportunity_id
      and o.recruiter_id = auth.uid()
  )
);

drop policy if exists matches_delete_recruiter on public.matches;
create policy matches_delete_recruiter on public.matches
for delete using (
  exists (
    select 1
    from public.opportunities o
    where o.opportunity_id = matches.opportunity_id
      and o.recruiter_id = auth.uid()
  )
);
