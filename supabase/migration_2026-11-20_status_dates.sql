-- ===========================================================================
-- 마이그레이션: projects 상태(status) · 날짜(start_date, end_date) 열 정리
-- 실행: Supabase 대시보드 > SQL Editor → 이 파일 전체를 붙여넣고 Run
--
--   · 이미 schema.sql 을 실행한 DB에서 이 파일을 한 번 실행하세요.
--   · 아직 schema.sql 을 실행하지 않았다면 schema.sql 만 실행하면 됩니다.
--     (schema.sql 의 create table 에도 같은 기본값·제약이 들어 있다.)
--   · 여러 번 실행해도 안전합니다(없는 열만 추가, 기존 값은 덮어쓰지 않음).
--   · SQL Editor 는 관리자 권한이라 RLS 를 우회합니다. 모든 사용자의 행을
--     한 번에 보정하기 위한 파일이므로 계정별로 실행할 필요가 없습니다.
-- ===========================================================================

-- 1. 없는 열만 추가한다. 먼저 null 로 두고 아래에서 기존 행을 채운다. --------
alter table public.projects add column if not exists status text;
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists end_date date;

-- 2. 날짜가 비어 있던 기존 행을 채운다. ---------------------------------------
--    created_at 이 있으면 그 날짜를, 없으면 실행 당일을 시작일로 쓴다.
--    종료일이 비어 있으면 시작일과 같은 날(하루 일정)로 둔다.
update public.projects
   set start_date = coalesce(start_date, created_at::date, current_date)
 where start_date is null;

update public.projects
   set end_date = coalesce(end_date, start_date)
 where end_date is null;

-- 종료일이 시작일보다 빠른 기존 행은 시작일과 같게 고친다.
-- (이 상태로 두면 아래 date 제약을 걸 때 실패한다.)
update public.projects
   set end_date = start_date
 where end_date < start_date;

-- 3. status 를 채운다. -------------------------------------------------------
--    이미 올바른 값이면 그대로 두고, 비었거나 다른 값이면 날짜로 추정한다.
--      · 종료일이 어제 이전 → 완료
--      · 시작일이 오늘 이전 또는 오늘 → 진행중
--      · 그 외(미래 시작) → 진행예정
update public.projects
   set status = case
     when status in ('진행예정', '진행중', '완료') then status
     when end_date < current_date then '완료'
     when start_date <= current_date then '진행중'
     else '진행예정'
   end
 where status is null
    or status not in ('진행예정', '진행중', '완료');

-- 4. 새로 넣는 행의 기본값과 not null 을 적용한다. ---------------------------
alter table public.projects alter column status set default '진행예정';
alter table public.projects alter column status set not null;
alter table public.projects alter column start_date set not null;
alter table public.projects alter column end_date set not null;

-- 5. 제약을 schema.sql 과 같게 맞춘다. ---------------------------------------
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('진행예정', '진행중', '완료'));

alter table public.projects drop constraint if exists projects_date_order;
alter table public.projects add constraint projects_date_order
  check (end_date >= start_date);

do $$
begin
  raise notice 'projects 상태/날짜 열 정리 완료. 기본 status: 진행예정';
end $$;
