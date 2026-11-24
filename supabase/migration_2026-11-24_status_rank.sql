-- ===========================================================================
-- 마이그레이션: 프로젝트 목록 상태순 정렬용 status_rank 추가
-- 실행: Supabase 대시보드 > SQL Editor → 이 파일 전체를 붙여넣고 Run
--
--   · 전체 필터에서 진행중 → 진행예정 → 완료 순으로 보여주려면 상태 글자를
--     정렬하는 것만으로는 안 되므로 정렬용 숫자 열을 둔다.
--   · generated column이라 status가 바뀌면 값이 자동으로 다시 계산된다.
--     열을 추가하는 순간 기존 데이터도 함께 채워진다.
--   · 여러 번 실행해도 안전하다(없는 것만 만든다).
--   · status가 text든 enum이든 비교가 되도록 status::text를 쓴다.
-- ===========================================================================

-- 1. 정렬용 열 ---------------------------------------------------------------
alter table public.projects
  add column if not exists status_rank integer
  generated always as (
    case
      when status::text = '진행중' then 1
      when status::text = '진행예정' then 2
      when status::text = '완료' then 3
      else 4
    end
  ) stored;

-- 2. 조회용 인덱스 -----------------------------------------------------------
create index if not exists projects_user_rank_created_idx
  on public.projects (user_id, status_rank, created_at);

-- 3. PostgREST 스키마 캐시 갱신 ----------------------------------------------
notify pgrst, 'reload schema';
