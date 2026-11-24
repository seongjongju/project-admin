"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  addDays,
  diffDays,
  formatRangeCompact,
  overlapRange,
  shiftMonth,
  toDateKey,
  weekdayOf,
} from "@/lib/date";
import { getHolidayName } from "@/lib/holidays";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectSchedule,
  type ProjectStatus,
  type ScheduleInput,
} from "@/lib/store";
import { STATUS_META } from "./ProjectBadges";
import ScheduleForm from "./ScheduleForm";

const MIN_CELL = 28;
const MAX_DAYS = 100;
const DEFAULT_WIDTH = MIN_CELL * 35;
const DAY_ROW_HEIGHT = 28;
const BAR_HEIGHT = 18;
const BAR_GAP = 2;

type DragMode = "start" | "end" | "move";
type Drag = {
  id: string;
  mode: DragMode;
  title: string;
  status: ProjectStatus;
  originX: number;
  originalStart: string;
  originalEnd: string;
  startDate: string;
  endDate: string;
  moved: boolean;
};
type Dialog =
  | { mode: "create"; day: string }
  | { mode: "edit"; schedule: ProjectSchedule };
type Popover = { id: string; left: number };
type Segment = {
  schedule: ProjectSchedule;
  startCol: number;
  endCol: number;
  lane: number;
  continueLeft: boolean;
  continueRight: boolean;
};

type Props = {
  project: Project;
  onSaveSchedule: (
    projectId: string,
    input: ScheduleInput & { id?: string },
  ) => void;
  onDeleteSchedule: (projectId: string, scheduleId: string) => void;
};

/** 카드 상단의 일정표. 컨테이너 폭에 맞춘 날짜 칸 위에 일정 바를 얹는다. */
export default function ProjectTimeline({
  project,
  onSaveSchedule,
  onDeleteSchedule,
}: Props) {
  const today = toDateKey(new Date());
  const [cursor, setCursor] = useState(today);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const dayCount = Math.min(
    MAX_DAYS,
    Math.max(1, Math.floor(width / MIN_CELL)),
  );
  const cellWidth = Math.max(MIN_CELL, width / dayCount);

  useEffect(() => {
    const element = stripRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? element.clientWidth;
      if (measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const from = useMemo(() => addDays(cursor, -weekdayOf(cursor)), [cursor]);
  const to = addDays(from, dayCount - 1);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => addDays(from, index)),
    [from, dayCount],
  );

  function datesOf(schedule: ProjectSchedule) {
    return drag?.id === schedule.id
      ? { startDate: drag.startDate, endDate: drag.endDate }
      : schedule;
  }

  const segments = useMemo(() => {
    const lanes: [number, number][][] = [];
    return project.schedules.flatMap<Segment>((schedule) => {
      const { startDate, endDate } = datesOf(schedule);
      const clipped = overlapRange(startDate, endDate, from, to);
      if (!clipped) return [];
      const startCol = diffDays(from, clipped[0]);
      const endCol = diffDays(from, clipped[1]);

      let lane = lanes.findIndex((ranges) =>
        ranges.every(([start, end]) => endCol < start || startCol > end),
      );
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push([startCol, endCol]);

      return [
        {
          schedule,
          startCol,
          endCol,
          lane,
          continueLeft: startDate < from,
          continueRight: endDate > to,
        },
      ];
    });
    // datesOf는 drag 값에만 의존한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.schedules, from, to, drag]);
  const laneCount = Math.max(
    1,
    ...segments.map((segment) => segment.lane + 1),
  );
  const trackHeight = laneCount * (BAR_HEIGHT + BAR_GAP);

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    function handleMove(event: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      const deltaX = event.clientX - current.originX;
      const movedDays = Math.round(deltaX / cellWidth);
      const moved = Math.abs(deltaX) >= 4 && movedDays !== 0;

      let startDate = current.originalStart;
      let endDate = current.originalEnd;
      if (current.mode === "start") {
        const candidate = addDays(startDate, movedDays);
        startDate = candidate > endDate ? endDate : candidate;
      } else if (current.mode === "end") {
        const candidate = addDays(endDate, movedDays);
        endDate = candidate < startDate ? startDate : candidate;
      } else {
        startDate = addDays(startDate, movedDays);
        endDate = addDays(endDate, movedDays);
      }

      const next = { ...current, startDate, endDate, moved };
      dragRef.current = next;
      setDrag(next);
    }

    function finish(save: boolean) {
      const latest = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!latest?.moved || !save) return;

      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      onSaveSchedule(project.id, {
        id: latest.id,
        title: latest.title,
        startDate: latest.startDate,
        endDate: latest.endDate,
        status: latest.status,
      });
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
  }, [dragging, project.id, onSaveSchedule, cellWidth]);

  useEffect(() => {
    if (!popover) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-schedule-bar]") ||
        target.closest("[data-schedule-popover]")
      ) {
        return;
      }
      setPopover(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    schedule: ProjectSchedule,
    mode: DragMode,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setPopover(null);
    const next: Drag = {
      id: schedule.id,
      mode,
      originX: event.clientX,
      originalStart: schedule.startDate,
      originalEnd: schedule.endDate,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      moved: false,
      title: schedule.title,
      status: schedule.status,
    };
    dragRef.current = next;
    setDrag(next);
  }

  function nudge(schedule: ProjectSchedule, edge: "start" | "end", delta: number) {
    const startDate =
      edge === "start" ? addDays(schedule.startDate, delta) : schedule.startDate;
    const endDate =
      edge === "end" ? addDays(schedule.endDate, delta) : schedule.endDate;
    if (startDate > endDate) return;
    onSaveSchedule(project.id, {
      id: schedule.id,
      title: schedule.title,
      startDate,
      endDate,
      status: schedule.status,
    });
  }

  function openPopover(event: React.MouseEvent, schedule: ProjectSchedule) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const strip = stripRef.current?.getBoundingClientRect();
    const bar = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const maxLeft = Math.max(0, (stripRef.current?.clientWidth ?? 400) - 144);
    const left = strip
      ? Math.min(Math.max(0, bar.left - strip.left), maxLeft)
      : 0;
    setPopover({ id: schedule.id, left });
  }

  function deleteSchedule(schedule: ProjectSchedule) {
    if (!window.confirm(`"${schedule.title}" 일정을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setPopover(null);
    onDeleteSchedule(project.id, schedule.id);
  }

  async function submitDialog(input: ScheduleInput) {
    if (dialog?.mode === "edit") {
      onSaveSchedule(project.id, { ...input, id: dialog.schedule.id });
    } else if (dialog) {
      onSaveSchedule(project.id, input);
    }
    setDialog(null);
  }

  const popoverSchedule =
    popover && project.schedules.find((schedule) => schedule.id === popover.id);

  return (
    <div className="border-b border-line bg-schedule" data-timeline>
      <div ref={stripRef} className="relative px-3">
        <div
          className="relative border-b border-grid"
          style={{ height: trackHeight + DAY_ROW_HEIGHT }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {dayCount > 1 && (
              <div
                className="absolute inset-y-0"
                style={{
                  left: cellWidth,
                  width: (dayCount - 1) * cellWidth,
                  backgroundImage:
                    "linear-gradient(to right, var(--color-grid) 1px, transparent 1px)",
                  backgroundSize: `${cellWidth}px 100%`,
                }}
              />
            )}
            {Array.from({ length: laneCount - 1 }, (_, index) => (
              <div
                key={index}
                className="absolute right-0 left-0 border-t border-grid"
                style={{ top: (index + 1) * (BAR_HEIGHT + BAR_GAP) - 1 }}
              />
            ))}
            <div
              className="absolute right-0 left-0 border-t border-grid"
              style={{ top: trackHeight }}
            />
          </div>

          <div className="relative" style={{ height: trackHeight }}>
            {segments.map(({ schedule, startCol, endCol, lane, continueLeft, continueRight }) => {
              const shown = datesOf(schedule);
              return (
                <div
                  key={schedule.id}
                  data-schedule-bar
                  onPointerDown={(event) => {
                    if (event.button === 0) startDrag(event, schedule, "move");
                  }}
                  onClick={(event) => openPopover(event, schedule)}
                  title={`${schedule.title} · ${formatRangeCompact(shown.startDate, shown.endDate)} · ${schedule.status}`}
                  className={`absolute flex cursor-grab touch-none items-center overflow-hidden text-[13px] leading-none active:cursor-grabbing ${STATUS_META[schedule.status].bar} ${
                    continueLeft ? "rounded-l-none" : "rounded-l-[2px]"
                  } ${continueRight ? "rounded-r-none" : "rounded-r-[2px]"}`}
                  style={{
                    left: `${(startCol / dayCount) * 100}%`,
                    width: `${((endCol - startCol + 1) / dayCount) * 100}%`,
                    top: lane * (BAR_HEIGHT + BAR_GAP),
                    height: BAR_HEIGHT,
                  }}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => startDrag(event, schedule, "start")}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                      event.preventDefault();
                      nudge(schedule, "start", event.key === "ArrowLeft" ? -1 : 1);
                    }}
                    aria-label={`${schedule.title} 시작날짜 조절`}
                    className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize touch-none"
                  />
                  <span className="min-w-0 flex-1 truncate px-2">{schedule.title}</span>
                  <button
                    type="button"
                    onPointerDown={(event) => startDrag(event, schedule, "end")}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                      event.preventDefault();
                      nudge(schedule, "end", event.key === "ArrowLeft" ? -1 : 1);
                    }}
                    aria-label={`${schedule.title} 끝날짜 조절`}
                    className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize touch-none"
                  />
                </div>
              );
            })}
            {drag?.moved && (
              <span
                aria-live="polite"
                className="absolute top-0 left-1/2 z-20 -translate-x-1/2 bg-schedule px-1 text-ui leading-none tabular-nums text-accent"
              >
                {formatRangeCompact(drag.startDate, drag.endDate)}
              </span>
            )}
          </div>

          <div className="relative flex select-none" style={{ height: DAY_ROW_HEIGHT }}>
            {days.map((day) => {
              const weekday = weekdayOf(day);
              const holiday = getHolidayName(day);
              const isToday = day === today;
              const label =
                day.slice(8) === "01"
                  ? `${Number(day.slice(5, 7))}/1`
                  : Number(day.slice(8));
              const color =
                isToday
                  ? "bg-today text-today-ink font-strong"
                  : holiday || weekday === 0
                    ? "text-sunday font-strong"
                    : weekday === 6
                      ? "text-saturday font-strong"
                      : "text-ink";

              return (
                <button
                  key={day}
                  type="button"
                  onDoubleClick={() => setDialog({ mode: "create", day })}
                  title={`${day}${holiday ? ` ${holiday}` : ""} 더블클릭으로 일정 등록`}
                  aria-label={`${day}${holiday ? ` ${holiday}` : ""}${isToday ? " 오늘" : ""} 더블클릭으로 일정 등록`}
                  className={`flex h-full shrink-0 items-center justify-center text-[11px] tabular-nums ${color}`}
                  style={{ width: `${100 / dayCount}%` }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {popover && popoverSchedule && (
          <div
            data-schedule-popover
            role="menu"
            aria-label={`${popoverSchedule.title} 일정 메뉴`}
            className="absolute top-full z-40 mt-1 w-36 border border-line bg-surface p-1"
            style={{ left: popover.left }}
          >
            <p className="truncate px-2 py-1 text-[11px] text-muted">
              {popoverSchedule.title}
            </p>
            {PROJECT_STATUSES.map((status: ProjectStatus) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPopover(null);
                  if (status !== popoverSchedule.status) {
                    onSaveSchedule(project.id, {
                      id: popoverSchedule.id,
                      title: popoverSchedule.title,
                      startDate: popoverSchedule.startDate,
                      endDate: popoverSchedule.endDate,
                      status,
                    });
                  }
                }}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-ui hover:bg-accent-soft ${
                  status === popoverSchedule.status
                    ? "font-strong text-accent"
                    : "text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[status].dot}`}
                />
                {status}
              </button>
            ))}
            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPopover(null);
                  setDialog({ mode: "edit", schedule: popoverSchedule });
                }}
                className="block w-full px-2 py-1.5 text-left text-ui text-ink hover:bg-accent-soft"
              >
                수정
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => deleteSchedule(popoverSchedule)}
                className="block w-full px-2 py-1.5 text-left text-ui text-danger hover:bg-accent-soft"
              >
                삭제
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 px-3 py-1 text-[12px] text-muted">
        <button
          type="button"
          onClick={() => setCursor(shiftMonth(cursor, -1))}
          aria-label="한 달 전"
          title="한 달 전"
          className="h-6 w-6 rounded-[2px] hover:bg-accent-soft hover:text-ink"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => setCursor(addDays(cursor, -7))}
          aria-label="일주일 전"
          title="일주일 전"
          className="h-6 w-6 rounded-[2px] hover:bg-accent-soft hover:text-ink"
        >
          ‹
        </button>
        <span className="min-w-16 text-center tabular-nums text-ink">{from}</span>
        <button
          type="button"
          onClick={() => setCursor(addDays(cursor, 7))}
          aria-label="일주일 후"
          title="일주일 후"
          className="h-6 w-6 rounded-[2px] hover:bg-accent-soft hover:text-ink"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setCursor(shiftMonth(cursor, 1))}
          aria-label="한 달 후"
          title="한 달 후"
          className="h-6 w-6 rounded-[2px] hover:bg-accent-soft hover:text-ink"
        >
          »
        </button>
        <button
          type="button"
          onClick={() => setCursor(today)}
          className="ml-1 h-6 rounded-[2px] px-2 hover:bg-accent-soft hover:text-ink"
        >
          오늘
        </button>
        <span className="ml-auto hidden text-[11px] sm:inline">
          날짜를 더블클릭하면 일정이 추가됩니다
        </span>
      </div>

      {dialog && (
        <Modal
          title={dialog.mode === "create" ? "일정 등록" : "일정 수정"}
          onClose={() => setDialog(null)}
        >
          <ScheduleForm
            initial={
              dialog.mode === "create"
                ? { title: "", startDate: dialog.day, endDate: dialog.day, status: "진행예정" }
                : {
                    title: dialog.schedule.title,
                    startDate: dialog.schedule.startDate,
                    endDate: dialog.schedule.endDate,
                    status: dialog.schedule.status,
                  }
            }
            submitLabel={dialog.mode === "create" ? "등록" : "저장"}
            onSubmit={submitDialog}
            onCancel={() => setDialog(null)}
          />
        </Modal>
      )}
    </div>
  );
}
