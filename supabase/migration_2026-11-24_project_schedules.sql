-- ===========================================================================
-- 마이그레이션: 프로젝트 일정 분리 (project_schedules)
-- 실행: Supabase 대시보드 > SQL Editor → 이 파일 전체를 붙여넣고 Run
--
--   · 이미 schema.sql 을 실행한 DB에서 한 번 실행하세요.
--   · 여러 번 실행해도 안전합니다(없는 것만 만들고, 기존 일정은 덮어쓰지 않음).
--   · SQL Editor 는 관리자 권한이라 RLS 를 우회합니다. 모든 사용자의 행을
--     한 번에 옮기므로 계정별로 실행할 필요가 없습니다.
--   · 프로젝트의 status 열은 그대로 둡니다. 일정 status 와 서로 영향주지 않습니다.
-- ===========================================================================

-- 1. 일정 테이블 -------------------------------------------------------------
create table if not exists public.project_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  status text not null default '진행예정',
  created_at timestamptz not null default now(),
  constraint project_schedules_title_not_blank check (btrim(title) <> ''),
  constraint project_schedules_status_check
    check (status in ('진행예정', '진행중', '완료')),
  constraint project_schedules_date_order check (end_date >= start_date)
);

create index if not exists project_schedules_project_start_idx
  on public.project_schedules (project_id, start_date);

-- 2. 기존 프로젝트의 기간을 일정 1개로 옮긴다 --------------------------------
--    제목은 프로젝트명을 그대로 쓴다. 이미 일정이 있는 프로젝트는 건너뛴다.
insert into public.project_schedules (project_id, title, start_date, end_date, status)
select p.id, p.title, p.start_date, p.end_date, p.status
from public.projects p
where p.start_date is not null
  and p.end_date is not null
  and not exists (
    select 1 from public.project_schedules s where s.project_id = p.id
  );

-- 3. projects 의 날짜 열을 nullable 로 바꾼다 --------------------------------
--    값은 지우지 않는다(2번에서 같은 값을 일정에 옮겼다). 이제 앱은 이 열을
--    쓰지 않고 일정의 min/max 로 기간을 계산한다.
alter table public.projects alter column start_date drop not null;
alter table public.projects alter column end_date drop not null;

alter table public.projects drop constraint if exists projects_date_order;
alter table public.projects add constraint projects_date_order
  check (start_date is null or end_date is null or end_date >= start_date);

-- 4. RLS: 부모 프로젝트가 내 것인지로 확인 -----------------------------------
alter table public.project_schedules enable row level security;

drop policy if exists project_schedules_select on public.project_schedules;
create policy project_schedules_select on public.project_schedules
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists project_schedules_insert on public.project_schedules;
create policy project_schedules_insert on public.project_schedules
  for insert to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists project_schedules_update on public.project_schedules;
create policy project_schedules_update on public.project_schedules
  for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists project_schedules_delete on public.project_schedules;
create policy project_schedules_delete on public.project_schedules
  for delete to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- 5. 일정 저장 RPC (security invoker) ----------------------------------------
create or replace function public.save_project_schedule(p_project_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_title text := btrim(coalesce(p_payload->>'title', ''));
  v_start date := (p_payload->>'startDate')::date;
  v_end date := (p_payload->>'endDate')::date;
  v_status text := coalesce(p_payload->>'status', '진행예정');
  v_result uuid;
begin
  if not exists (
    select 1 from projects p
    where p.id = p_project_id and p.user_id = auth.uid()
  ) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;
  if v_title = '' then
    raise exception 'SCHEDULE_TITLE_REQUIRED';
  end if;
  if v_start is null or v_end is null then
    raise exception 'SCHEDULE_DATE_REQUIRED';
  end if;
  if v_end < v_start then
    raise exception 'SCHEDULE_DATE_ORDER';
  end if;
  if v_status not in ('진행예정', '진행중', '완료') then
    raise exception 'SCHEDULE_STATUS_INVALID';
  end if;

  if v_id is null then
    insert into project_schedules (project_id, title, start_date, end_date, status)
    values (p_project_id, v_title, v_start, v_end, v_status)
    returning id into v_result;
  else
    update project_schedules set
      title = v_title,
      start_date = v_start,
      end_date = v_end,
      status = v_status
    where id = v_id and project_id = p_project_id
    returning id into v_result;

    if v_result is null then
      raise exception 'SCHEDULE_NOT_FOUND';
    end if;
  end if;

  return v_result;
end;
$$;

revoke all on function public.save_project_schedule(uuid, jsonb) from public;
grant execute on function public.save_project_schedule(uuid, jsonb) to authenticated;
grant select, insert, update, delete on public.project_schedules to authenticated;

do $$
begin
  raise notice 'project_schedules 마이그레이션 완료. 기존 기간은 일정 1개로 옮겨졌습니다.';
end $$;
