alter table public.candidate_profiles
add column if not exists passport_slug text;

alter table public.candidate_profiles
drop constraint if exists candidate_profiles_passport_slug_format;

alter table public.candidate_profiles
add constraint candidate_profiles_passport_slug_format
check (
  passport_slug is null
  or passport_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
);

create unique index if not exists candidate_profiles_passport_slug_key
on public.candidate_profiles (passport_slug)
where passport_slug is not null;
