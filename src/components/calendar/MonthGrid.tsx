"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDays,
  diffDays,
  formatDate,
  formatRange,
  getMonthWeeks,
  startOfMonth,
  toDateKey,
  type CalendarWeek,
} from "@/lib/date";
import {
  PROJECT_STATUSES,
  type Project,
} from "@/lib/store";
import { getHolidayName } from "@/lib/holidays";
import { STATUS_META } from "@/components/projects/ProjectBadges";

type MonthGridProps = {
  projects: Project[];
  onCreate: (date: string) => void;
  onSelect: (project: Project) => void;
  onDayOpen: (date: string) => void;
  onResize: (id: string, startDate: string, endDate: string) => void;
};

type DragState = {
  original: Project;
  edge: "start" | "end";
  originX: number;
  columnWidth: number;
  startDate: string;
  endDate: string;
  moved: boolean;
};

type Segment = {
  project: Project;
  startCol: number;
  endCol: number;
  lane: number;
  continueLeft: boolean;
  continueRight: boolean;
};

const LANE_TOP = 4;
const LANE_PITCH = 32;
const BAND_HEIGHT = 28;

/** 한 주 안에서 겹치는 프로젝트가 서로 다른 줄(lane)에 오도록 배치한다. */
function layoutWeek(week: CalendarWeek, projects: Project[]): Segment[] {
  const weekStart = week.days[0].key;
  const weekEnd = week.days[6].key;
  const lanes: [number, number][][] = [];

  return projects
    .filter(
      (project) =>
        project.startDate <= weekEnd && project.endDate >= weekStart,
    )
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        b.endDate.localeCompare(a.endDate) ||
        a.id.localeCompare(b.id),
    )
    .map((project) => {
      const startCol = Math.max(0, diffDays(weekStart, project.startDate));
      const endCol = Math.min(6, diffDays(weekStart, project.endDate));

      let lane = lanes.findIndex((ranges) =>
        ranges.every(([start, end]) => endCol < start || startCol > end),
      );
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push([startCol, endCol]);

      return {
        project,
        startCol,
        endCol,
        lane,
        continueLeft: project.startDate < weekStart,
        continueRight: project.endDate > weekEnd,
      };
    });
}

export default function MonthGrid({
  projects,
  onCreate,
  onSelect,
  onDayOpen,
  onResize,
}: MonthGridProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [gridWidth, setGridWidth] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const suppressClickUntil = useRef(0);
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setGridWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const dragging = drag !== null;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = getMonthWeeks(year, month);
  const today = toDateKey(new Date());
  const cellSize = gridWidth / 7;
  const displayProjects = drag
    ? projects.map((project) =>
        project.id === drag.original.id
          ? {
              ...project,
              startDate: drag.startDate,
              endDate: drag.endDate,
            }
          : project,
      )
    : projects;

  useEffect(() => {
    if (!dragging) return;

    function handleMove(event: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;

      const days = Math.round(
        (event.clientX - current.originX) / current.columnWidth,
      );
      let startDate = current.original.startDate;
      let endDate = current.original.endDate;

      if (current.edge === "start") {
        const movedStart = addDays(startDate, days);
        startDate = movedStart > endDate ? endDate : movedStart;
      } else {
        const movedEnd = addDays(endDate, days);
        endDate = movedEnd < startDate ? startDate : movedEnd;
      }

      const next: DragState = {
        ...current,
        startDate,
        endDate,
        moved:
          startDate !== current.original.startDate ||
          endDate !== current.original.endDate,
      };
      dragRef.current = next;
      setDrag(next);
    }

    function finish(save: boolean) {
      const latest = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!latest || !latest.moved) return;

      suppressClickUntil.current = Date.now() + 300;
      if (save) {
        onResizeRef.current(
          latest.original.id,
          latest.startDate,
          latest.endDate,
        );
      }
    }

    const handleUp = () => finish(true);
    const handleCancel = () => finish(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [dragging]);

  function startResize(
    event: React.PointerEvent<HTMLSpanElement>,
    project: Project,
    edge: "start" | "end",
  ) {
    event.preventDefault();
    event.stopPropagation();

    const width = gridWidth || gridRef.current?.getBoundingClientRect().width;
    if (!width) return;

    const next: DragState = {
      original: project,
      edge,
      originX: event.clientX,
      columnWidth: width / 7,
      startDate: project.startDate,
      endDate: project.endDate,
      moved: false,
    };
    dragRef.current = next;
    setDrag(next);
  }

  return (
    <div
      onClickCapture={(event) => {
        if (Date.now() < suppressClickUntil.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <h3
          aria-live="polite"
          className="text-name font-semibold tracking-[-0.01em] tabular-nums"
        >
          {year}년 {month + 1}월
        </h3>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="이전 달"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-accent-soft hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-accent-soft hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="ml-1 h-9 rounded-[2px] px-2.5 text-ui text-muted hover:bg-accent-soft hover:text-ink"
          >
            오늘
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pb-3 text-ui text-muted">
        {PROJECT_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`}
            />
            {status}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 border-y border-line">
        {["일", "월", "화", "수", "목", "금", "토"].map((label, index) => (
          <div
            key={label}
            className={`py-1.5 text-center text-ui font-strong ${
              index === 0
                ? "text-sunday"
                : index === 6
                  ? "text-saturday"
                  : "text-ink"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div ref={gridRef}>
        {weeks.map((week) => {
          const segments = layoutWeek(week, displayProjects);
          const laneCount = Math.max(
            1,
            ...segments.map((segment) => segment.lane + 1),
          );

          return (
            <div
              key={week.days[0].key}
              className="border-b border-line last:border-b-0"
              style={{ minHeight: cellSize || undefined }}
            >
              <div className="grid grid-cols-7">
                {week.days.map((day, index) => {
                  const isToday = day.key === today;
                  const holiday = getHolidayName(day.key);
                  const dayStrong = Boolean(holiday) || index === 0 || index === 6;
                  const dayColor = holiday || index === 0
                    ? "text-sunday"
                    : index === 6
                      ? "text-saturday"
                      : "text-ink hover:text-accent";
                  return (
                    <div
                      key={day.key}
                      className="flex h-6 items-center justify-center md:h-7"
                    >
                      <button
                        type="button"
                        onClick={() => onCreate(day.key)}
                        aria-label={`${formatDate(day.key)}${holiday ? ` ${holiday}` : ""} 프로젝트 추가`}
                        className="flex h-full w-full items-center justify-center gap-2 rounded-[2px] px-1 hover:bg-accent-soft/40"
                      >
                        <span
                          className={`flex shrink-0 items-center justify-center tabular-nums ${
                            isToday
                              ? "h-6 w-6 rounded-full bg-accent font-medium text-white md:h-7 md:w-7"
                              : day.inMonth
                                ? `text-ui ${dayColor}${dayStrong ? " font-strong" : ""}`
                                : "text-ui text-muted/50"
                          }`}
                        >
                          {day.day}
                        </span>
                        {holiday && day.inMonth && !isToday && (
                          <span className="hidden truncate text-ui text-sunday xl:inline">
                            {holiday}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div
                className="relative hidden sm:block"
                style={{
                  height: segments.length
                    ? LANE_TOP + laneCount * LANE_PITCH
                    : 0,
                }}
              >
                {segments.map((segment) => {
                  const { project, startCol, endCol, lane } = segment;
                  const single = project.startDate === project.endDate;
                  const meta = STATUS_META[project.status];
                  const handleClass =
                    "absolute inset-y-0 z-10 w-3 touch-none cursor-ew-resize";
                  const gripClass =
                    "pointer-events-none absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-current opacity-0 group-hover/bar:opacity-40 group-focus-visible/bar:opacity-40";

                  return (
                    <div
                      key={project.id}
                      className="pointer-events-none absolute"
                      style={{
                        left: `${(startCol / 7) * 100}%`,
                        width: `${((endCol - startCol + 1) / 7) * 100}%`,
                        top: LANE_TOP + lane * LANE_PITCH,
                        height: BAND_HEIGHT,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(project)}
                        title={`${project.title} (${formatRange(project.startDate, project.endDate)})`}
                        aria-label={`${project.title}, ${formatRange(project.startDate, project.endDate)}`}
                        className={`group/bar pointer-events-auto relative flex h-full items-center overflow-hidden text-left select-none ${
                          single
                            ? "w-fit max-w-full rounded-[2px]"
                            : `w-full rounded-[2px] transition-[filter] hover:brightness-95 ${meta.bar} ${
                                segment.continueLeft ? "rounded-l-none" : ""
                              } ${segment.continueRight ? "rounded-r-none" : ""}`
                        }`}
                      >
                        {!segment.continueLeft && (
                          <span
                            aria-hidden="true"
                            onPointerDown={(event) =>
                              startResize(event, project, "start")
                            }
                            className={`${handleClass} left-0`}
                          >
                            <span className={`${gripClass} left-0.5`} />
                          </span>
                        )}

                        {single ? (
                          <span className="ml-0.5 flex min-w-0 items-center gap-1.5 rounded-[2px] py-1 pr-2 pl-1 transition-colors group-hover/bar:bg-accent-soft group-focus-visible/bar:bg-accent-soft">
                            <span
                              aria-hidden="true"
                              className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                            />
                            <span className="truncate text-ui leading-none text-ink">
                              {project.title}
                            </span>
                          </span>
                        ) : (
                          <>
                            {!segment.continueLeft && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 w-[2px] rounded-l-[2px] bg-current opacity-80"
                              />
                            )}
                            <span
                              className={`w-full truncate pr-2 text-ui leading-none ${
                                segment.continueLeft ? "pl-2" : "pl-3"
                              }`}
                            >
                              {project.title}
                            </span>
                          </>
                        )}

                        {!segment.continueRight && (
                          <span
                            aria-hidden="true"
                            onPointerDown={(event) =>
                              startResize(event, project, "end")
                            }
                            className={`${handleClass} right-0`}
                          >
                            <span className={`${gripClass} right-0.5`} />
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 sm:hidden">
                {week.days.map((day) => {
                  const dayProjects = displayProjects.filter(
                    (project) =>
                      project.startDate <= day.key &&
                      project.endDate >= day.key,
                  );

                  return (
                    <div
                      key={day.key}
                      className="flex h-4 items-center justify-center"
                    >
                      {dayProjects.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => onSelect(dayProjects[0])}
                          aria-label={`${dayProjects[0].title} 상세 보기`}
                          className="flex h-full w-full items-center justify-center"
                        >
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-full ${
                              STATUS_META[dayProjects[0].status].dot
                            }`}
                          />
                        </button>
                      ) : dayProjects.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => onDayOpen(day.key)}
                          aria-label={`${formatDate(day.key)} 프로젝트 ${dayProjects.length}개 보기`}
                          className="flex h-full w-full items-center justify-center text-ui leading-none font-medium text-accent"
                        >
                          {dayProjects.length}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
