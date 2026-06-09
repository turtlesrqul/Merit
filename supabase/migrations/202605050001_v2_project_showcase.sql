alter table public.projects
add column if not exists hook text;

alter table public.projects
add column if not exists project_type text;

alter table public.projects
add column if not exists cover_image_url text;

alter table public.projects
add column if not exists is_featured boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_project_type_check'
  ) then
    alter table public.projects
    add constraint projects_project_type_check
    check (project_type in ('web', 'design', 'document', 'other'));
  end if;
end
$$;

create table if not exists public.project_views (
  project_id uuid not null references public.projects(project_id) on delete cascade,
  viewer_user_id uuid not null references public.users(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, viewer_user_id)
);

alter table public.project_views enable row level security;

drop policy if exists project_views_select on public.project_views;
create policy project_views_select on public.project_views
for select using (true);

drop policy if exists project_views_insert_own on public.project_views;
create policy project_views_insert_own on public.project_views
for insert with check (auth.uid() = viewer_user_id);

drop policy if exists project_views_delete_own on public.project_views;
create policy project_views_delete_own on public.project_views
for delete using (auth.uid() = viewer_user_id);

create index if not exists idx_saved_projects_project_id
on public.saved_projects(project_id);

create index if not exists idx_inspired_projects_project_id
on public.inspired_projects(project_id);

create index if not exists idx_project_views_project_id
on public.project_views(project_id);

update public.projects
set hook = left(coalesce(nullif(split_part(problem_solved, E'\n', 1), ''), title), 140)
where hook is null
  or btrim(hook) = '';

update public.projects
set project_type = case
  when lower(coalesce(category, '')) like '%web%' then 'web'
  when lower(coalesce(category, '')) like '%design%' then 'design'
  when lower(coalesce(category, '')) like '%ux%' then 'design'
  when lower(coalesce(category, '')) like '%document%' then 'document'
  when lower(coalesce(category, '')) like '%deck%' then 'document'
  when lower(coalesce(category, '')) like '%paper%' then 'document'
  else 'other'
end
where project_type is null
  or btrim(project_type) = '';

update public.projects p
set cover_image_url = coalesce(
  (
    select a.preview_url
    from public.artifacts a
    where a.project_id = p.project_id
      and a.preview_url is not null
      and btrim(a.preview_url) <> ''
    order by a.artifact_id
    limit 1
  ),
  (
    select a.artifact_url
    from public.artifacts a
    where a.project_id = p.project_id
      and lower(coalesce(a.artifact_type, '')) = 'image'
      and btrim(a.artifact_url) <> ''
    order by a.artifact_id
    limit 1
  )
)
where p.cover_image_url is null
  or btrim(p.cover_image_url) = '';
