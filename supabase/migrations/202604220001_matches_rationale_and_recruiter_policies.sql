alter table public.matches
add column if not exists match_rationale text[] default '{}'::text[];

drop policy if exists matches_manage_recruiter on public.matches;

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
