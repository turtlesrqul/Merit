create index if not exists passport_views_viewer_user_idx
on public.passport_views (viewer_user_id)
where viewer_user_id is not null;
