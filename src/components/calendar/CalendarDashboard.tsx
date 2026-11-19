"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { StatusBadge } from "@/components/projects/ProjectBadges";
import MonthlyProjects from "@/components/projects/MonthlyProjects";
import ProjectDetail from "@/components/projects/ProjectDetail";
import ProjectForm, {
  type ProjectDraft,
} from "@/components/projects/ProjectForm";
import { formatDate } from "@/lib/date";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
  type Project,
  type ProjectInput,
} from "@/lib/store";
import MonthGrid from "./MonthGrid";

type Dialog =
  | { mode: "create"; date: string }
  | { mode: "day"; date: string }
  | { mode: "detail"; project: Project }
  | { mode: "edit"; project: Project };

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "문제가 발생했습니다. 다시 시도해 주세요.";
}

function blankProject(date: string): ProjectDraft {
  return {
    title: "",
    kind: "",
    category: "",
    status: "진행예정",
    startDate: date,
    endDate: date,
    summary: "",
    role: "",
    url: "",
    memo: "",
    stacks: [],
  };
}

export default function CalendarDashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch((err) => {
        if (active) {
          setError(messageOf(err));
          setProjects([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function closeDialog() {
    setDialog(null);
  }

  async function reload() {
    setProjects(await listProjects());
    setError("");
  }

  async function handleSubmit(input: ProjectInput) {
    if (!dialog) return;
    if (dialog.mode === "edit") {
      await updateProject(dialog.project.id, input);
    } else {
      await createProject(input);
    }
    await reload();
    setDialog(null);
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    await reload();
    setDialog(null);
  }

  async function handleResize(
    id: string,
    startDate: string,
    endDate: string,
  ) {
    setProjects((previous) =>
      previous
        ? previous.map((project) =>
            project.id === id ? { ...project, startDate, endDate } : project,
          )
        : previous,
    );

    try {
      await updateProject(id, { startDate, endDate });
    } catch (err) {
      setError(messageOf(err));
      try {
        setProjects(await listProjects());
      } catch {
        // 새로고침도 실패하면 현재 화면을 유지한다.
      }
    }
  }

  const dayProjects =
    dialog?.mode === "day"
      ? (projects ?? []).filter(
          (project) =>
            project.startDate <= dialog.date &&
            project.endDate >= dialog.date,
        )
      : [];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-title font-semibold tracking-[-0.02em]">홈</h1>
        <p className="mt-2 text-ui text-muted">
          날짜를 눌러 프로젝트를 추가하고, 막대 양 끝을 끌어 기간을
          조절하세요.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 border-l-2 border-danger bg-surface py-2.5 pr-1 pl-3 text-ui text-danger"
        >
          <p className="min-w-0 break-words">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="오류 메시지 닫기"
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] hover:bg-accent-soft"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {projects ? (
        <>
          <section
            aria-labelledby="calendar-heading"
            className="border border-line bg-surface p-3 sm:p-5"
          >
            <h2 id="calendar-heading" className="text-section font-medium">
              일정 달력
            </h2>
            <div className="mt-4">
              <MonthGrid
                projects={projects}
                onCreate={(date) => setDialog({ mode: "create", date })}
                onSelect={(project) => setDialog({ mode: "detail", project })}
                onDayOpen={(date) => setDialog({ mode: "day", date })}
                onResize={handleResize}
              />
            </div>
          </section>
          <MonthlyProjects projects={projects} />
        </>
      ) : (
        <p className="border-t border-line py-16 text-center text-ui text-muted">
          달력을 불러오는 중…
        </p>
      )}

      {dialog?.mode === "create" && (
        <Modal
          key={`create-${dialog.date}`}
          title="새 프로젝트"
          onClose={closeDialog}
        >
          <ProjectForm
            initial={blankProject(dialog.date)}
            submitLabel="추가"
            onSubmit={handleSubmit}
            onCancel={closeDialog}
          />
        </Modal>
      )}

      {dialog?.mode === "day" && (
        <Modal
          key={`day-${dialog.date}`}
          title={`${formatDate(dialog.date)} 프로젝트`}
          onClose={closeDialog}
        >
          {dayProjects.length === 0 ? (
            <p className="text-ui text-muted">이 날의 프로젝트가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-line">
              {dayProjects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setDialog({ mode: "detail", project })
                    }
                    className="flex w-full flex-col items-start gap-1.5 py-3 text-left"
                  >
                    <span className="text-ui font-medium break-words">
                      {project.title}
                    </span>
                    <StatusBadge status={project.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {dialog?.mode === "detail" && (
        <Modal
          key={`detail-${dialog.project.id}`}
          title="프로젝트 상세"
          onClose={closeDialog}
        >
          <ProjectDetail
            project={dialog.project}
            onEdit={() =>
              setDialog({ mode: "edit", project: dialog.project })
            }
            onDelete={() => handleDelete(dialog.project.id)}
          />
        </Modal>
      )}

      {dialog?.mode === "edit" && (
        <Modal
          key={`edit-${dialog.project.id}`}
          title="프로젝트 수정"
          onClose={closeDialog}
        >
          <ProjectForm
            initial={dialog.project}
            submitLabel="저장"
            onSubmit={handleSubmit}
            onCancel={() =>
              setDialog({ mode: "detail", project: dialog.project })
            }
          />
        </Modal>
      )}
    </div>
  );
}
