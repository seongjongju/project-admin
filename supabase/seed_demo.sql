-- ===========================================================================
--  데모(샘플) 데이터 — 면접관용 테스트 계정에 넣는 데이터
--
--  ###########################################################################
--  #  경고: 아래 v_email 을 "본인 계정"으로 바꿔 실행하면                  #
--  #        본인 계정의 기존 프로젝트 데이터가 전부 삭제되고 샘플로 바뀝니다. #
--  #        테스트 계정 이메일만 적으세요.                                   #
--  ###########################################################################
--
--  동작
--   · v_email 이 비어 있거나 그 이메일의 계정을 찾지 못하면 아무것도 하지 않고 멈춘다.
--   · 실행할 때마다 대상 계정의 프로젝트를 지우고 샘플을 다시 넣는다.
--     (면접관이 수정·삭제해도 같은 스크립트를 다시 실행하면 원래 상태로 돌아온다.)
--   · 날짜는 실행한 날(current_date) 기준 상대 날짜다.
--   · 먼저 schema.sql 을 실행해 두어야 한다.
--   · Supabase 대시보드 > SQL Editor 에서 실행한다(RLS를 우회하는 관리자 권한).
-- ===========================================================================

do $$
declare
  v_email text := 'demo@example.com';  -- ← 여기에 테스트 계정 이메일을 적으세요 (예: 'demo@example.com')

  v_user uuid;
  v_month date := date_trunc('month', current_date)::date;          -- 이번 달 1일
  v_prev date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_next date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_today date := current_date;

  v_cat_shop uuid;
  v_cat_brand uuid;

  v_p1 uuid;
  v_p2 uuid;
  v_p3 uuid;
  v_p4 uuid;
begin
  -- 0. 대상 계정 확인 ------------------------------------------------------
  if btrim(v_email) = '' then
    raise notice '대상 이메일이 비어 있어 아무것도 하지 않습니다. v_email 을 채우세요.';
    return;
  end if;

  select id into v_user from auth.users where lower(email) = lower(btrim(v_email));
  if v_user is null then
    raise notice '계정을 찾지 못했습니다: %. 아무것도 하지 않습니다.', v_email;
    return;
  end if;

  -- 1. 기존 데이터 삭제 (자식 테이블은 cascade) ----------------------------
  delete from projects where user_id = v_user;

  -- 2. 종류를 먼저 만들고 id를 받아 둔다 -----------------------------------
  insert into categories (user_id, name) values
    (v_user, '회사홍보'),
    (v_user, '쇼핑몰')
  on conflict (user_id, lower(btrim(name))) do nothing;

  select id into v_cat_brand from categories
    where user_id = v_user and lower(btrim(name)) = '회사홍보';
  select id into v_cat_shop from categories
    where user_id = v_user and lower(btrim(name)) = '쇼핑몰';

  -- 3. 스택 목록 -----------------------------------------------------------
  insert into stacks (user_id, name)
    select v_user, name
    from unnest(array[
      'React', 'TypeScript', 'Next.js', 'HTML/CSS', 'JavaScript', 'Tailwind CSS'
    ]) as name
  on conflict (user_id, lower(btrim(name))) do nothing;

  -- 4. 프로젝트 ------------------------------------------------------------
  -- 진행중 (이번 달 시작, 회사)
  insert into projects (
    user_id, title, kind, category_id, status, start_date, end_date,
    summary, role, url, memo
  ) values (
    v_user, '커머스 상세페이지 개편', '회사', v_cat_shop, '진행중',
    v_month, v_today + 10,
    '상품 상세 페이지의 반응형 마크업과 옵션 선택 인터랙션 개선',
    '퍼블리싱', 'https://example.com/commerce',
    '모바일 옵션 선택 영역을 먼저 정리하고, 데스크톱은 다음 주에 확인'
  ) returning id into v_p1;

  -- 완료 (이번 달에 끝남, 회사)
  insert into projects (
    user_id, title, kind, category_id, status, start_date, end_date,
    summary, role, url, memo
  ) values (
    v_user, '브랜드 랜딩 페이지 퍼블리싱', '회사', v_cat_brand, '완료',
    v_prev + 19, least(v_today, v_month + 4),
    '신규 브랜드 소개를 위한 원페이지 사이트 퍼블리싱',
    '퍼블리싱', 'https://example.com/brand',
    '스크롤 애니메이션과 반응형 처리까지 마무리'
  ) returning id into v_p2;

  -- 진행예정 (다음 달, 회사)
  insert into projects (
    user_id, title, kind, category_id, status, start_date, end_date,
    summary, role, url, memo
  ) values (
    v_user, '사내 어드민 리뉴얼', '회사', v_cat_brand, '진행예정',
    v_next + 2, v_next + 21,
    '레거시 관리자 화면을 React 기반으로 다시 만드는 프로젝트',
    '프론트엔드', '',
    '디자인 시안이 나오면 목록 화면부터 시작'
  ) returning id into v_p3;

  -- 진행중 (지난달 시작, 개인)
  insert into projects (
    user_id, title, kind, category_id, status, start_date, end_date,
    summary, role, url, memo
  ) values (
    v_user, '포트폴리오 사이트', '개인', null, '진행중',
    v_prev + 14, v_today + 20,
    '작업 기록을 정리해 보여주는 개인 포트폴리오',
    '기획 · 디자인 · 개발', 'https://example.com/portfolio',
    '프로젝트 상세와 기록 화면을 먼저 만든다'
  ) returning id into v_p4;

  -- 완료 (지난달, 개인)
  insert into projects (
    user_id, title, kind, category_id, status, start_date, end_date,
    summary, role, url, memo
  ) values (
    v_user, '날씨 대시보드', '개인', null, '완료',
    v_prev + 2, v_prev + 19,
    'OpenWeather API를 활용한 도시별 날씨 화면',
    '프론트엔드', 'https://example.com/weather', ''
  );

  -- 진행예정 (다음 달, 개인)
  insert into projects (
    user_id, title, kind, category_id, status, start_date, end_date,
    summary, role, url, memo
  ) values (
    v_user, '사이드 프로젝트 기획', '개인', null, '진행예정',
    v_next + 9, v_next + 23,
    '다음 달에 시작할 개인 작업의 화면과 일정 정리',
    '기획', '', ''
  );

  -- 5. 사용 스택 연결 ------------------------------------------------------
  insert into project_stacks (project_id, stack_id)
    select v_p1, s.id from stacks s
    where s.user_id = v_user and s.name in ('React', 'TypeScript', 'Tailwind CSS')
  on conflict do nothing;

  insert into project_stacks (project_id, stack_id)
    select v_p2, s.id from stacks s
    where s.user_id = v_user and s.name in ('HTML/CSS', 'JavaScript')
  on conflict do nothing;

  insert into project_stacks (project_id, stack_id)
    select v_p3, s.id from stacks s
    where s.user_id = v_user and s.name in ('React', 'TypeScript')
  on conflict do nothing;

  insert into project_stacks (project_id, stack_id)
    select v_p4, s.id from stacks s
    where s.user_id = v_user and s.name in ('Next.js', 'TypeScript', 'Tailwind CSS')
  on conflict do nothing;

  -- 6. 트러블슈팅 + 해결방법 -----------------------------------------------
  insert into troubles (project_id, position, trouble, solution) values
    (v_p1, 0,
     '모바일에서 옵션 선택 영역이 화면 밖으로 넘쳐 가로 스크롤이 생겼다.',
     '선택 영역을 감싸던 고정 폭을 없애고 flex-wrap으로 바꿔 줄바꿈되게 했다.'),
    (v_p1, 1,
     '옵션을 빠르게 연속으로 누르면 선택 상태가 한 번씩 어긋났다.',
     '상태를 이전 값 기준으로 갱신하고, 클릭 이벤트는 한 번만 처리되게 정리했다.'),
    (v_p2, 0,
     '스크롤 애니메이션이 Safari에서만 끊겨 보였다.',
     'transform 대신 opacity와 translateY를 함께 쓰고 will-change를 걸었다.');

  -- 7. 몰랐던 점 + 배운점 --------------------------------------------------
  insert into learnings (project_id, position, unknown, learned) values
    (v_p1, 0,
     '이미지 없이 텍스트만으로 상세 페이지 높이를 맞추는 방법을 몰랐다.',
     'line-height와 clamp()를 조합하면 이미지 없이도 비율을 맞출 수 있다.'),
    (v_p1, 1,
     '터치 기기에서 hover 스타일이 남는 이유를 몰랐다.',
     'hover는 (hover: hover) 미디어 쿼리 안에서만 쓰는 게 안전하다.'),
    (v_p2, 0,
     'CSS로 스크롤 진행률을 다루는 방법을 몰랐다.',
     'scroll-timeline을 지원하지 않는 브라우저는 IntersectionObserver로 대체했다.');

  raise notice '데모 데이터를 넣었습니다: %', v_email;
end $$;
