"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  createProject,
  deleteSchedule,
  listQueryString,
  queryProjects,
  readListFilter,
  totalPageCount,
  updateProject,
  uploadProjectFiles,
  upsertSchedule,
  type ListFilter,
  type Project,
  type ProjectInput,
  type ProjectKind,
  type ProjectStatus,
  type ScheduleInput,
} from "@/lib/store";
import ProjectCard from "./ProjectCard";
import ProjectFilterBar from "./ProjectFilterBar";
import ProjectPagination from "./ProjectPagination";
import ProjectForm, { type ProjectDraft } from "./ProjectForm";
import type { AttachmentChanges } from "./FileAttachField";

type ProjectsViewProps = {
  kind: ProjectKind;
  title: string;
};

function blankProject(kind: ProjectKind): ProjectDraft {
  return {
    title: "",
    kind,
    categoryId: "",
    status: "진행예정",
    summary: "",
    role: "",
    url: "",
    memo: "",
    stacks: [],
  };
}

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "문제가 발생했습니다. 다시 시도해 주세요.";
}

export default function ProjectsView({ kind, title }: ProjectsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filter = useMemo(
    () => readListFilter(new URLSearchParams(queryString)),
    [queryString],
  );
  const { q, status, from, to, page } = filter;

  const [result, setResult] = useState<{ projects: Project[]; total: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const requestRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const previousPage = useRef(page);

  const setFilter = useCallback(
    (patch: Partial<ListFilter>) => {
      const next = { ...filter, ...patch, page: patch.page ?? 1 };
      const search = listQueryString(next);
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [filter, pathname, router],
  );

  function applyFilter(patch: Partial<ListFilter>) {
    setError("");
    setSlow(false);
    setFilter(patch);
  }

  useEffect(() => {
    const request = ++requestRef.current;
    const timer = window.setTimeout(() => {
      if (requestRef.current === request) setSlow(true);
    }, 150);

    queryProjects({ kind, q, status, from, to, page })
      .then((data) => {
        if (requestRef.current !== request) return;
        window.clearTimeout(timer);
        setSlow(false);
        const pages = totalPageCount(data.total);
        if (page > pages) {
          setFilter({ page: pages });
          return;
        }
        setResult(data);
      })
      .catch(() => {
        if (requestRef.current !== request) return;
        window.clearTimeout(timer);
        setSlow(false);
        setError("불러오지 못했습니다. 다시 시도");
        setResult({ projects: [], total: 0 });
      });

    return () => window.clearTimeout(timer);
  }, [kind, q, status, from, to, page, reloadKey, setFilter]);

  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    listRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [page]);

  function retry() {
    setError("");
    setSlow(false);
    setResult(null);
    setReloadKey((key) => key + 1);
  }

  async function handleCreate(
    input: ProjectInput,
    attachments: AttachmentChanges,
  ) {
    const project = await createProject(input);
    try {
      await uploadProjectFiles(project.id, attachments.added);
    } catch (err) {
      setError(
        `프로젝트는 저장됐지만 파일을 올리지 못했습니다. ${messageOf(err)} 상세 페이지에서 다시 첨부해 주세요.`,
      );
    }
    setReloadKey((key) => key + 1);
    setCreating(false);
  }

  async function changeStatus(project: Project, status: ProjectStatus) {
    const next = await updateProject(project.id, { status });
    setResult((previous) =>
      previous
        ? {
            ...previous,
            projects: previous.projects.map((item) =>
              item.id === next.id ? next : item,
            ),
          }
        : previous,
    );
    setReloadKey((key) => key + 1);
  }

  async function saveSchedule(
    projectId: string,
    input: ScheduleInput & { id?: string },
  ) {
    setError("");
    try {
      const next = await upsertSchedule(projectId, input);
      setResult((previous) =>
        previous
          ? {
              ...previous,
              projects: previous.projects.map((item) =>
                item.id === projectId ? next : item,
              ),
            }
          : previous,
      );
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function removeSchedule(projectId: string, scheduleId: string) {
    setError("");
    try {
      const next = await deleteSchedule(projectId, scheduleId);
      setResult((previous) =>
        previous
          ? {
              ...previous,
              projects: previous.projects.map((item) =>
                item.id === projectId ? next : item,
              ),
            }
          : previous,
      );
    } catch (err) {
      setError(messageOf(err));
    }
  }

  const detailQuery = queryString;
  const detailHref = (id: string) =>
    `/projects/${id}${detailQuery ? `?${detailQuery}` : ""}`;

  return (
    <div ref={listRef} className="flex w-full scroll-mt-6 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="mt-2 text-ui text-muted">
            전체는 진행중 → 진행예정 → 완료 순으로, 상태를 고르면 등록 순으로
            보여줍니다. 날짜를 더블클릭해 일정을 추가하고, 상태 뱃지를 눌러
            프로젝트 진행 상태를 바꿀 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-11 shrink-0 rounded-[2px] bg-ink px-5 text-ui font-medium text-paper hover:bg-ink/85"
        >
          프로젝트 등록
        </button>
      </header>

      <ProjectFilterBar
        q={q}
        status={status}
        from={from}
        to={to}
        total={result?.total ?? 0}
        onSearch={(value) => applyFilter({ q: value })}
        onStatus={(next) => applyFilter({ status: next })}
        onDate={(start, end) => applyFilter({ from: start, to: end })}
        onReset={() => {
          setError("");
          setSlow(false);
          router.replace(pathname, { scroll: false });
        }}
      />

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-danger bg-surface py-2.5 pr-3 pl-3 text-ui text-danger"
        >
          <p className="min-w-0 flex-1">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="h-8 shrink-0 rounded-[2px] px-2 text-ui font-medium underline-offset-4 hover:underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {slow ? (
        <div role="status" className="flex flex-col gap-6">
          <p className="sr-only">불러오는 중…</p>
          {[0, 1, 2].map((index) => (
            <div key={index} className="border border-line bg-surface p-4">
              <div className="h-5 w-1/3 bg-planned" />
              <div className="mt-4 h-4 w-full bg-planned" />
              <div className="mt-2 h-4 w-2/3 bg-planned" />
            </div>
          ))}
        </div>
      ) : !result || result.projects.length === 0 ? (
        <p className="py-16 text-center text-ui text-muted">
          조건에 맞는 프로젝트가 없습니다.
        </p>
      ) : (
        /* 필터·페이지가 바뀌면 카드를 다시 만들어 접힌 메모도 기본값으로 돌아간다. */
        <ul key={`${q}|${status}|${from}|${to}|${page}`} className="flex flex-col gap-6">
          {result.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              detailHref={detailHref(project.id)}
              onChangeStatus={(next) => changeStatus(project, next)}
              onSaveSchedule={saveSchedule}
              onDeleteSchedule={removeSchedule}
            />
          ))}
        </ul>
      )}

      {result && (
        <ProjectPagination
          page={page}
          totalPages={totalPageCount(result.total)}
          onChange={(next) => applyFilter({ page: next })}
        />
      )}

      {creating && (
        <Modal title="프로젝트 등록" onClose={() => setCreating(false)}>
          <ProjectForm
            initial={blankProject(kind)}
            lockedKind={kind}
            submitLabel="등록"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </div>
  );
}
