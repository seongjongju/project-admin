"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  createProject,
  deleteSchedule,
  listQueryString,
  parseStatuses,
  queryProjects,
  readListFilter,
  totalPageCount,
  updateProject,
  upsertSchedule,
  type ListFilter,
  type Project,
  type ProjectInput,
  type ProjectKind,
  type ProjectStatus,
  type ScheduleInput,
} from "@/lib/store";
import { KindBadge, StatusBadgeMenu } from "./ProjectBadges";
import ProjectFilterBar from "./ProjectFilterBar";
import ProjectPagination from "./ProjectPagination";
import ProjectForm, { type ProjectDraft } from "./ProjectForm";
import ProjectTimeline from "./ProjectTimeline";

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ui text-muted">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-ui break-words">{children}</dd>
    </div>
  );
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
  const { q, statuses, from, to, page } = filter;
  const statusKey = statuses.join(",");

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

    queryProjects({
      kind,
      q,
      statuses: parseStatuses(statusKey ? statusKey.split(",") : []),
      from,
      to,
      page,
    })
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
  }, [kind, q, statusKey, from, to, page, reloadKey, setFilter]);

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

  async function handleCreate(input: ProjectInput) {
    await createProject(input);
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
            등록한 순서대로 보여줍니다. 날짜를 더블클릭해 일정을 추가하고,
            상태 뱃지를 눌러 프로젝트 진행 상태를 바꿀 수 있습니다.
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
        statuses={statuses}
        from={from}
        to={to}
        total={result?.total ?? 0}
        onSearch={(value) => applyFilter({ q: value })}
        onStatuses={(next) => applyFilter({ statuses: next })}
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
        <ul className="flex flex-col gap-6">
          {result.projects.map((project) => (
            <li key={project.id} className="border border-line bg-surface">
              <ProjectTimeline
                project={project}
                onSaveSchedule={saveSchedule}
                onDeleteSchedule={removeSchedule}
              />
              <div className="flex flex-col gap-4 px-3 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={detailHref(project.id)}
                    className="text-name font-medium break-words hover:text-accent"
                  >
                    {project.title}
                  </Link>
                  <StatusBadgeMenu
                    status={project.status}
                    onChange={(status) => changeStatus(project, status)}
                  />
                  <KindBadge kind={project.kind} />
                  {project.kind === "회사" && project.category && (
                    <span className="inline-flex items-center rounded-[2px] border border-line px-2 py-0.5 text-ui leading-tight text-muted">
                      {project.category}
                    </span>
                  )}
                </div>

                <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  <Field label="한 줄 소개">{project.summary || "—"}</Field>
                  <Field label="내 역할">{project.role || "—"}</Field>
                  <Field label="링크">
                    {project.url ? (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-accent underline-offset-4 hover:underline"
                      >
                        {project.url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Field>
                  <Field label="사용 스택">
                    {project.stacks.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {project.stacks.map((stack) => (
                          <span
                            key={stack}
                            className="rounded-[2px] bg-accent-soft px-2 py-0.5 text-ui text-accent"
                          >
                            {stack}
                          </span>
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Field>
                  <Field label="메모">
                    {project.memo ? (
                      <span className="whitespace-pre-wrap">{project.memo}</span>
                    ) : (
                      "—"
                    )}
                  </Field>
                </dl>

                <Link
                  href={detailHref(project.id)}
                  className="self-start text-ui text-accent underline-offset-4 hover:underline"
                >
                  상세에서 기록 보기 →
                </Link>
              </div>
            </li>
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
            submitLabel="등록"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </div>
  );
}
