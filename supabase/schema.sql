-- ===========================================================================
-- 프로젝트 기록장 — Supabase 스키마 (테이블 · 제약 · RLS · RPC)
--
-- 실행: Supabase 대시보드 > SQL Editor → 이 파일 전체를 붙여넣고 Run
--   · 최초 1회 실행한다. 여러 번 실행해도 기존 데이터를 지우지 않는다
--     (테이블은 create if not exists, 정책·함수는 매번 새로 만든다).
--   · 구조를 바꿔야 할 때는 이 파일을 고치지 말고 별도 마이그레이션 SQL을 쓴다.
--
-- 보안 원칙
--   · 앱은 publishable 키만 쓴다. service_role/secret 키는 쓰지 않는다.
--   · 모든 테이블에 RLS를 켜고 user_id = auth.uid() 로 본인 데이터만 보이게 한다.
--   · RPC 함수는 security invoker 로 만들어 RLS를 우회하지 않는다.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. 선택지 목록: 스택 / 종류
--    같은 사용자 안에서 대소문자만 다른 값은 저장되지 않는다 (unique index).
-- ---------------------------------------------------------------------------
create table if not exists public.stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint stacks_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists stacks_user_name_key
  on public.stacks (user_id, lower(btrim(name)));

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists categories_user_name_key
  on public.categories (user_id, lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- 2. 프로젝트 (= 일정)
--    category_id 는 종류 테이블의 id 를 가리킨다. 이름을 바꾸면 자동 반영된다.
--    on delete set null: 종류를 삭제하면 프로젝트의 category_id 는 null 이 된다.
--    계정 삭제 시 종류가 cascade 로 지워져도 프로젝트 삭제가 막히지 않는다.
--    깨진 id 는 남지 않고 "종류 선택 안 함" 상태가 된다.
--    status 는 진행예정/진행중/완료 중 하나. 값을 넣지 않으면 진행예정이 기본값.
--    start_date / end_date 는 예전 열로, 앱에서는 쓰지 않는다(null 허용).
--    프로젝트 기간은 project_schedules 에서 계산한다.
--    이미 실행된 DB에서 열을 추가·보정할 때는 migration_2026-11-20_status_dates.sql 을 쓴다.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  kind text not null,
  category_id uuid references public.categories (id) on delete set null,
  status text not null default '진행예정',
  start_date date,
  end_date date,
  summary text not null default '',
  role text not null default '',
  url text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now(),
  constraint projects_title_not_blank check (btrim(title) <> ''),
  constraint projects_kind_check check (kind in ('회사', '개인')),
  constraint projects_status_check check (status in ('진행예정', '진행중', '완료')),
  constraint projects_date_order check (
    start_date is null or end_date is null or end_date >= start_date
  ),
  -- 종류는 회사 프로젝트에만 있을 수 있다.
  constraint projects_category_company_only check (kind = '회사' or category_id is null)
);

create index if not exists projects_user_start_idx
  on public.projects (user_id, start_date desc);

-- 2-1. 프로젝트 일정. 한 프로젝트에 여러 개. 프로젝트 상태와 별개의 status 를 갖는다.
--      user_id 를 두지 않고 부모 프로젝트의 소유자로 RLS 를 건다.
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

-- ---------------------------------------------------------------------------
-- 3. 자식 테이블: 스택 연결 / 트러블슈팅 / 배운점
--    부모 프로젝트를 지우면 함께 지워진다 (on delete cascade).
--    position 은 작성 순서. 항목을 지웠다 넣어도 순서가 유지된다.
-- ---------------------------------------------------------------------------
create table if not exists public.project_stacks (
  project_id uuid not null references public.projects (id) on delete cascade,
  stack_id uuid not null references public.stacks (id) on delete cascade,
  primary key (project_id, stack_id)
);

create table if not exists public.troubles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position int not null,
  trouble text not null default '',
  solution text not null default ''
);

create index if not exists troubles_project_position_idx
  on public.troubles (project_id, position);

create table if not exists public.learnings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position int not null,
  unknown text not null default '',
  learned text not null default ''
);

create index if not exists learnings_project_position_idx
  on public.learnings (project_id, position);

-- ---------------------------------------------------------------------------
-- 4. RLS
--    본인 데이터만 조회·수정. 자식 테이블은 "부모 프로젝트가 내 것인지"로 확인한다.
--    delete 정책을 만들지 않은 동작(스택/종류/자식 수정)은 API로 할 수 없다.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_schedules enable row level security;
alter table public.stacks enable row level security;
alter table public.categories enable row level security;
alter table public.project_stacks enable row level security;
alter table public.troubles enable row level security;
alter table public.learnings enable row level security;

-- projects ------------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated using (user_id = auth.uid());

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated with check (
    user_id = auth.uid()
    -- 다른 사용자의 종류 id를 연결하지 못하게 한다.
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = category_id and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = category_id and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated using (user_id = auth.uid());

-- project_schedules: 부모가 내 것인지로 확인 (select/insert/update/delete 모두)
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

-- stacks / categories (조회, 추가만. 삭제 UI는 아직 없어 delete 정책을 두지 않는다)
drop policy if exists stacks_select on public.stacks;
create policy stacks_select on public.stacks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists stacks_insert on public.stacks;
create policy stacks_insert on public.stacks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated using (user_id = auth.uid());

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated with check (user_id = auth.uid());

-- project_stacks: 부모가 내 것 + 그 스택도 내 것 --------------------------------
drop policy if exists project_stacks_select on public.project_stacks;
create policy project_stacks_select on public.project_stacks
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists project_stacks_insert on public.project_stacks;
create policy project_stacks_insert on public.project_stacks
  for insert to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.stacks s
      where s.id = stack_id and s.user_id = auth.uid()
    )
  );

drop policy if exists project_stacks_delete on public.project_stacks;
create policy project_stacks_delete on public.project_stacks
  for delete to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- troubles / learnings: 부모가 내 것인지로 확인 --------------------------------
drop policy if exists troubles_select on public.troubles;
create policy troubles_select on public.troubles
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists troubles_insert on public.troubles;
create policy troubles_insert on public.troubles
  for insert to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists troubles_delete on public.troubles;
create policy troubles_delete on public.troubles
  for delete to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists learnings_select on public.learnings;
create policy learnings_select on public.learnings
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists learnings_insert on public.learnings;
create policy learnings_insert on public.learnings
  for insert to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists learnings_delete on public.learnings;
create policy learnings_delete on public.learnings
  for delete to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RPC
--    모두 security invoker: 호출한 사용자의 권한으로 실행되고 RLS를 우회하지 않는다.
--    함수 안에서 프로젝트/종류 소유자도 한 번 더 확인한다(이중 방어).
-- ---------------------------------------------------------------------------

-- 5-1. 종류/스택 추가. 이미 있으면(대소문자 무시) 기존 값을 반환한다.
create or replace function public.add_option(p_kind text, p_name text)
returns table (id uuid, name text)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_name = '' then
    raise exception 'OPTION_NAME_REQUIRED';
  end if;

  if p_kind = 'stack' then
    insert into stacks (name) values (v_name)
      on conflict (user_id, lower(btrim(name))) do nothing;

    select s.id into v_id from stacks s
      where s.user_id = auth.uid() and lower(btrim(s.name)) = lower(v_name);

    return query select s.id, s.name from stacks s where s.id = v_id;
  elsif p_kind = 'category' then
    insert into categories (name) values (v_name)
      on conflict (user_id, lower(btrim(name))) do nothing;

    select c.id into v_id from categories c
      where c.user_id = auth.uid() and lower(btrim(c.name)) = lower(v_name);

    return query select c.id, c.name from categories c where c.id = v_id;
  else
    raise exception 'OPTION_KIND_INVALID';
  end if;
end;
$$;

-- 5-2. 프로젝트 저장(등록/수정) + 스택 연결. 한 트랜잭션에서 전부 성공하거나 전부 롤백.
create or replace function public.save_project(p_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
  v_kind text := coalesce(p_payload->>'kind', '');
  v_category uuid :=
    nullif(btrim(coalesce(p_payload->>'categoryId', '')), '')::uuid;
  v_name text;
begin
  if btrim(coalesce(p_payload->>'title', '')) = '' then
    raise exception 'TITLE_REQUIRED';
  end if;

  -- 종류는 회사 프로젝트에만 둔다. 개인으로 바뀌면 연결을 끊는다.
  if v_kind <> '회사' then
    v_category := null;
  end if;

  -- 다른 사용자의 종류 id를 연결하지 못하게 함수에서도 확인한다.
  if v_category is not null and not exists (
    select 1 from categories c
    where c.id = v_category and c.user_id = auth.uid()
  ) then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  if v_id is null then
    insert into projects (
      title, kind, category_id, status,
      start_date, end_date, summary, role, url, memo
    ) values (
      btrim(p_payload->>'title'),
      v_kind,
      v_category,
      p_payload->>'status',
      (p_payload->>'startDate')::date,
      (p_payload->>'endDate')::date,
      coalesce(p_payload->>'summary', ''),
      coalesce(p_payload->>'role', ''),
      coalesce(p_payload->>'url', ''),
      coalesce(p_payload->>'memo', '')
    )
    returning id into v_id;
  else
    -- RLS가 남의 프로젝트를 걸러내므로 0행이 갱신되면 "없는 프로젝트"다.
    update projects set
      title = btrim(p_payload->>'title'),
      kind = v_kind,
      category_id = v_category,
      status = p_payload->>'status',
      start_date = (p_payload->>'startDate')::date,
      end_date = (p_payload->>'endDate')::date,
      summary = coalesce(p_payload->>'summary', ''),
      role = coalesce(p_payload->>'role', ''),
      url = coalesce(p_payload->>'url', ''),
      memo = coalesce(p_payload->>'memo', '')
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'PROJECT_NOT_FOUND';
    end if;
  end if;

  -- 스택 연결은 전부 지우고 이름 기준으로 다시 넣는다. 목록에 없는 이름은 새로 만든다.
  delete from project_stacks where project_id = v_id;

  for v_name in
    select distinct btrim(value)
    from jsonb_array_elements_text(coalesce(p_payload->'stacks', '[]'::jsonb))
  loop
    continue when v_name = '';

    insert into stacks (name) values (v_name)
      on conflict (user_id, lower(btrim(name))) do nothing;

    insert into project_stacks (project_id, stack_id)
      select v_id, s.id from stacks s
      where s.user_id = auth.uid() and lower(btrim(s.name)) = lower(v_name)
      on conflict do nothing;
  end loop;

  return v_id;
end;
$$;

-- 5-2-1. 프로젝트 일정 저장(추가/수정). 날짜·상태를 검사하고 소유자도 확인한다.
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

-- 5-3. 기록(트러블슈팅 / 배운점) 저장. 순서(position)를 유지하며 전부 다시 넣는다.
create or replace function public.save_project_records(
  p_project_id uuid,
  p_troubles jsonb,
  p_learnings jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- 남의 프로젝트 id로는 아무것도 바꾸지 못한다.
  if not exists (
    select 1 from projects p
    where p.id = p_project_id and p.user_id = auth.uid()
  ) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  delete from troubles where project_id = p_project_id;
  insert into troubles (project_id, position, trouble, solution)
    select
      p_project_id,
      (t.ord - 1)::int,
      coalesce(t.item->>'trouble', ''),
      coalesce(t.item->>'solution', '')
    from jsonb_array_elements(
      coalesce(p_troubles, '[]'::jsonb)
    ) with ordinality as t(item, ord)
    where btrim(coalesce(t.item->>'trouble', '')) <> ''
       or btrim(coalesce(t.item->>'solution', '')) <> '';

  delete from learnings where project_id = p_project_id;
  insert into learnings (project_id, position, unknown, learned)
    select
      p_project_id,
      (t.ord - 1)::int,
      coalesce(t.item->>'unknown', ''),
      coalesce(t.item->>'learned', '')
    from jsonb_array_elements(
      coalesce(p_learnings, '[]'::jsonb)
    ) with ordinality as t(item, ord)
    where btrim(coalesce(t.item->>'unknown', '')) <> ''
       or btrim(coalesce(t.item->>'learned', '')) <> '';
end;
$$;

-- 로그인한 사용자만 RPC를 실행할 수 있게 한다 (익명 키만으로는 실행 불가).
revoke all on function public.add_option(text, text) from public;
revoke all on function public.save_project(uuid, jsonb) from public;
revoke all on function public.save_project_schedule(uuid, jsonb) from public;
revoke all on function public.save_project_records(uuid, jsonb, jsonb) from public;

grant execute on function public.add_option(text, text) to authenticated;
grant execute on function public.save_project(uuid, jsonb) to authenticated;
grant execute on function public.save_project_schedule(uuid, jsonb) to authenticated;
grant execute on function public.save_project_records(uuid, jsonb, jsonb) to authenticated;


-- 6. 테이블 권한 (Supabase 새 기본 정책: 명시적으로 허용해야 API에서 보인다)
-- RLS 정책과 같은 범위로 최소 권한만 준다. anon(로그인 전)에게는 주지 않는다.
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_schedules to authenticated;
grant select, insert on public.stacks to authenticated;
grant select, insert on public.categories to authenticated;
grant select, insert, delete on public.project_stacks to authenticated;
grant select, insert, delete on public.troubles to authenticated;
grant select, insert, delete on public.learnings to authenticated;