create table if not exists public.project_reports (
  report_id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(project_id) on delete cascade,
  reporter_user_id uuid not null references public.users(user_id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.hidden_projects (
  project_id uuid primary key references public.projects(project_id) on delete cascade,
  hidden_by uuid not null references public.users(user_id) on delete cascade,
  reason text not null default 'moderation',
  created_at timestamptz not null default now()
);

alter table public.project_reports enable row level security;
alter table public.hidden_projects enable row level security;

drop policy if exists project_reports_insert_own on public.project_reports;
create policy project_reports_insert_own on public.project_reports
for insert with check (auth.uid() = reporter_user_id);

create index if not exists idx_project_reports_project_id
on public.project_reports(project_id);

create index if not exists idx_hidden_projects_hidden_by
on public.hidden_projects(hidden_by);
