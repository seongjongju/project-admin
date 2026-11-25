-- ===========================================================================
-- 마이그레이션: 공유 스택 목록에서 삭제 기능 추가
-- 실행: Supabase 대시보드 > SQL Editor → 이 파일 전체를 붙여넣고 Run
--
--   · 지금은 새 스택만 추가할 수 있고 공유 목록에서 지울 수 없다.
--   · 스택은 모든 프로젝트가 공유하므로, 쓰고 있는 프로젝트가 있으면 삭제를 막는다.
--   · 삭제 권한은 내 스택에만 걸고, 사용 여부 확인 + 삭제는 RPC 한 번에서 처리한다.
--   · 여러 번 실행해도 안전하다(정책·함수는 다시 만든다).
-- ===========================================================================

-- 1. RLS: 내 스택만 삭제 ------------------------------------------------------
drop policy if exists stacks_delete on public.stacks;
create policy stacks_delete on public.stacks
  for delete to authenticated using (user_id = auth.uid());

-- 2. 삭제 함수: 사용 중이면 중단 ---------------------------------------------
create or replace function public.delete_stack(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (select 1 from public.project_stacks ps where ps.stack_id = p_id) then
    raise exception 'STACK_IN_USE';
  end if;

  delete from public.stacks s where s.id = p_id and s.user_id = auth.uid();
end;
$$;

-- 3. 권한 --------------------------------------------------------------------
grant execute on function public.delete_stack(uuid) to authenticated;
grant delete on public.stacks to authenticated;

-- 4. PostgREST 스키마 캐시 갱신 ----------------------------------------------
notify pgrst, 'reload schema';
