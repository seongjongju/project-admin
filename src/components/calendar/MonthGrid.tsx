"use client";

import { useEffect, useRef, useState } from "react";
import {
  diffDays,
  formatDate,
  formatRange,
  getMonthWeeks,
  startOfMonth,
  toDateKey,
  type CalendarWeek,
} from "@/lib/date";
import { PROJECT_STATUSES, type ScheduleItem } from "@/lib/store";
import { getHolidayName } from "@/lib/holidays";
import { STATUS_META } from "@/components/projects/ProjectBadges";

type MonthGridProps = {
  items: ScheduleItem[];
  onSelect: (item: ScheduleItem) => void;
  onDayOpen: (date: string) => void;
};

type Segment = {
  item: ScheduleItem;
  startCol: number;
  endCol: number;
  lane: number;
  continueLeft: boolean;
  continueRight: boolean;
};

const LANE_TOP = 4;
const LANE_PITCH = 32;
const BAND_HEIGHT = 28;

/** 한 주 안에서 겹치는 일정이 서로 다른 줄(lane)에 오도록 배치한다. */
function layoutWeek(week: CalendarWeek, items: ScheduleItem[]): Segment[] {
  const weekStart = week.days[0].key;
  const weekEnd = week.days[6].key;
  const lanes: [number, number][][] = [];

  return items
    .filter((item) => item.startDate <= weekEnd && item.endDate >= weekStart)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        b.endDate.localeCompare(a.endDate) ||
        a.id.localeCompare(b.id),
    )
    .map((item) => {
      const startCol = Math.max(0, diffDays(weekStart, item.startDate));
      const endCol = Math.min(6, diffDays(weekStart, item.endDate));

      let lane = lanes.findIndex((ranges) =>
        ranges.every(([start, end]) => endCol < start || startCol > end),
      );
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push([startCol, endCol]);

      return {
        item,
        startCol,
        endCol,
        lane,
        continueLeft: item.startDate < weekStart,
        continueRight: item.endDate > weekEnd,
      };
    });
}

export default function MonthGrid({
  items,
  onSelect,
  onDayOpen,
}: MonthGridProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [gridWidth, setGridWidth] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setGridWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = getMonthWeeks(year, month);
  const today = toDateKey(new Date());
  const cellSize = gridWidth / 7;

  return (
    <div>
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
              className={`h-2 w-2 rounded-[2px] ${STATUS_META[status].dot}`}
            />
            {status}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 border-y border-line">
        {["일", "월", "화", "수", "목", "금", "토"].map((label, index) => (
          <div
            key={label}
            className={`border-r border-grid py-1.5 text-center text-ui font-strong last:border-r-0 bg-[#f8f8f8] ${
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
          const segments = layoutWeek(week, items);
          const laneCount = Math.max(
            1,
            ...segments.map((segment) => segment.lane + 1),
          );

          return (
            <div
              key={week.days[0].key}
              className="border-b border-grid last:border-b-0"
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
                      className="flex h-6 items-center justify-center border-r border-grid last:border-r-0 md:h-7"
                    >
                      <button
                        type="button"
                        onClick={() => onDayOpen(day.key)}
                        aria-label={`${formatDate(day.key)}${holiday ? ` ${holiday}` : ""} 프로젝트 보기`}
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
                className="relative hidden border-t border-grid sm:block"
                style={{
                  height: segments.length
                    ? LANE_TOP + laneCount * LANE_PITCH
                    : 0,
                }}
              >
                {segments.map((segment) => {
                  const { item, startCol, endCol, lane } = segment;
                  const single = item.startDate === item.endDate;
                  const meta = STATUS_META[item.status];
                  const label = `${item.projectTitle} · ${item.title}`;

                  return (
                    <div
                      key={item.id}
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
                        onClick={() => onSelect(item)}
                        title={`${label} (${formatRange(item.startDate, item.endDate)})`}
                        aria-label={`${label}, ${formatRange(item.startDate, item.endDate)}`}
                        className={`group/bar pointer-events-auto relative flex h-full items-center overflow-hidden text-left select-none ${
                          single
                            ? "w-fit max-w-full rounded-[2px]"
                            : `w-full rounded-[2px] transition-[filter] hover:brightness-95 ${meta.bar} ${
                                segment.continueLeft ? "rounded-l-none" : ""
                              } ${segment.continueRight ? "rounded-r-none" : ""}`
                        }`}
                      >
                        {single ? (
                          <span className="ml-0.5 flex min-w-0 items-center gap-1.5 rounded-[2px] py-1 pr-2 pl-1 transition-colors group-hover/bar:bg-accent-soft group-focus-visible/bar:bg-accent-soft">
                            <span
                              aria-hidden="true"
                              className={`h-2 w-2 shrink-0 rounded-[2px] ${meta.dot}`}
                            />
                            <span className="truncate text-ui leading-none text-ink">
                              {label}
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
                              {label}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 border-t border-grid sm:hidden">
                {week.days.map((day) => {
                  const dayItems = items.filter(
                    (item) =>
                      item.startDate <= day.key && item.endDate >= day.key,
                  );
                  // 같은 상태가 여러 개여도 마크는 한 번만, 범례 순서로 보여준다.
                  const statuses = PROJECT_STATUSES.filter((status) =>
                    dayItems.some((item) => item.status === status),
                  );

                  return (
                    <div
                      key={day.key}
                      className="flex h-4 items-center justify-center border-r border-grid last:border-r-0"
                    >
                      {dayItems.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => onSelect(dayItems[0])}
                          aria-label={`${dayItems[0].projectTitle} · ${dayItems[0].title} 상세 보기`}
                          className="flex h-full w-full items-center justify-center"
                        >
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-[2px] ${
                              STATUS_META[dayItems[0].status].dot
                            }`}
                          />
                        </button>
                      ) : dayItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => onDayOpen(day.key)}
                          aria-label={`${formatDate(day.key)} 일정 ${dayItems.length}개 보기: ${statuses.join(", ")}`}
                          className="flex h-full w-full items-center justify-center gap-0.5"
                        >
                          {statuses.map((status) => (
                            <span
                              key={status}
                              aria-hidden="true"
                              className={`h-2 w-2 shrink-0 rounded-[2px] ${STATUS_META[status].dot}`}
                            />
                          ))}
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
