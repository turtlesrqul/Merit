insert into storage.buckets (id, name, public, file_size_limit)
values ('project-artifacts', 'project-artifacts', true, 52428800)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800;

drop policy if exists "project_artifacts_public_read" on storage.objects;
create policy "project_artifacts_public_read"
on storage.objects
for select
using (bucket_id = 'project-artifacts');

drop policy if exists "project_artifacts_insert_own_folder" on storage.objects;
create policy "project_artifacts_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-artifacts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_artifacts_update_own_folder" on storage.objects;
create policy "project_artifacts_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-artifacts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-artifacts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_artifacts_delete_own_folder" on storage.objects;
create policy "project_artifacts_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-artifacts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
