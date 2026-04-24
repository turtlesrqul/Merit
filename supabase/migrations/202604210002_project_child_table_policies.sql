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
