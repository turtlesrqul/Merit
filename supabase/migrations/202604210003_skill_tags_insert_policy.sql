drop policy if exists skill_tags_insert_authenticated on public.skill_tags;
create policy skill_tags_insert_authenticated on public.skill_tags
for insert with check (auth.role() = 'authenticated');
