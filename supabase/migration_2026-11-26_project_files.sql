-- ===========================================================================
-- 프로젝트 첨부 파일 (2026-11-26)
--
-- 실행: Supabase 대시보드 > SQL Editor → 이 파일 전체를 붙여넣고 Run.
--   · 여러 번 실행해도 기존 파일을 지우지 않는다.
--   · 버킷은 비공개다. URL을 알아도 로그인하지 않으면 열 수 없다.
--   · 저장 경로: {user_id}/{project_id}/{uuid}-{파일명}
--     Storage 정책이 첫 폴더(= 소유자)와 두 번째 폴더(= 프로젝트)를 검사한다.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = false;

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null,
  name text not null,
  size bigint not null,
  content_type text not null default '',
  created_at timestamptz not null default now(),
  constraint project_files_name_not_blank check (btrim(name) <> ''),
  constraint project_files_size_nonnegative check (size >= 0),
  constraint project_files_path_key unique (path)
);

create index if not exists project_files_project_created_idx
  on public.project_files (project_id, created_at);

alter table public.project_files enable row level security;

-- 메타 테이블: 본인 파일만 읽고·올리고·삭제한다.
drop policy if exists project_files_select on public.project_files;
create policy project_files_select on public.project_files
  for select to authenticated using (user_id = auth.uid());

drop policy if exists project_files_insert on public.project_files;
create policy project_files_insert on public.project_files
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists project_files_delete on public.project_files;
create policy project_files_delete on public.project_files
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.project_files to authenticated;

-- Storage 객체: 경로의 첫 폴더가 소유자, 두 번째 폴더가 프로젝트다.
-- 다른 계정의 폴더는 읽거나 쓸 수 없다.
drop policy if exists project_files_storage_select on storage.objects;
create policy project_files_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists project_files_storage_insert on storage.objects;
create policy project_files_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists project_files_storage_update on storage.objects;
create policy project_files_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists project_files_storage_delete on storage.objects;
create policy project_files_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
