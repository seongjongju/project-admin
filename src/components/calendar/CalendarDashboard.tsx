"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import ProjectReminder from "@/components/ProjectReminder";
import { StatusBadge } from "@/components/projects/ProjectBadges";
import MonthlyProjects from "@/components/projects/MonthlyProjects";
import ProjectDetail from "@/components/projects/ProjectDetail";
import { formatDate, formatRange } from "@/lib/date";
import {
  flatScheduleItems,
  listProjects,
  type Project,
  type ScheduleItem,
} from "@/lib/store";
import MonthGrid from "./MonthGrid";

type Dialog =
  | { mode: "day"; date: string }
  | { mode: "detail"; project: Project; item: ScheduleItem | null };

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "문제가 발생했습니다. 다시 시도해 주세요.";
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

  async function retry() {
    setError("");
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(messageOf(err));
    }
  }

  const items = flatScheduleItems(projects ?? []);
  const dayItems =
    dialog?.mode === "day"
      ? items.filter(
          (item) =>
            item.startDate <= dialog.date && item.endDate >= dialog.date,
        )
      : [];

  function openItem(item: ScheduleItem) {
    const project = projects?.find((entry) => entry.id === item.projectId);
    if (project) setDialog({ mode: "detail", project, item });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold tracking-[-0.02em]">홈</h1>
          <p className="mt-2 text-ui text-muted">
            등록한 일정을 날짜별로 보여줍니다. 날짜나 일정 막대를 누르면 내용을
            확인할 수 있어요.
          </p>
        </div>
        <ProjectReminder />
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 border-l-2 border-danger bg-surface py-2.5 pr-1 pl-3 text-ui text-danger"
        >
          <p className="min-w-0 flex-1 break-words">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="h-8 shrink-0 rounded-[2px] px-2 text-ui font-medium underline-offset-4 hover:underline"
          >
            다시 시도
          </button>
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
                items={items}
                onSelect={openItem}
                onDayOpen={(date) => setDialog({ mode: "day", date })}
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

      {dialog?.mode === "day" && (
        <Modal
          key={`day-${dialog.date}`}
          title={`${formatDate(dialog.date)} 프로젝트`}
          onClose={closeDialog}
        >
          {dayItems.length === 0 ? (
            <p className="text-ui text-muted">이 날의 일정이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-line">
              {dayItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="flex w-full flex-col items-start gap-1.5 py-3 text-left"
                  >
                    <span className="text-ui font-medium break-words">
                      {item.projectTitle}
                    </span>
                    <span className="text-ui break-words text-muted">
                      {item.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-[12px] tabular-nums text-muted">
                        {formatRange(item.startDate, item.endDate)}
                      </span>
                    </span>
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
          title={
            dialog.item
              ? `${dialog.item.projectTitle} · ${dialog.item.title}`
              : "프로젝트 상세"
          }
          onClose={closeDialog}
        >
          <ProjectDetail project={dialog.project} />
        </Modal>
      )}
    </div>
  );
}
