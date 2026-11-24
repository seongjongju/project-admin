"use client";

import { useEffect, useRef } from "react";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/store";
import { inputBase } from "./formStyles";

type ProjectFilterBarProps = {
  q: string;
  statuses: ProjectStatus[];
  from: string;
  to: string;
  total: number;
  onSearch: (value: string) => void;
  onStatuses: (statuses: ProjectStatus[]) => void;
  onDate: (from: string, to: string) => void;
  onReset: () => void;
};

export default function ProjectFilterBar({
  q,
  statuses,
  from,
  to,
  total,
  onSearch,
  onStatuses,
  onDate,
  onReset,
}: ProjectFilterBarProps) {
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  const composing = useRef(false);

  useEffect(() => {
    // 주소가 바뀐 경우(뒤로 가기 등)에만 입력값을 맞춘다.
    window.clearTimeout(timer.current);
    if (input.current && input.current.value !== q) input.current.value = q;
    return () => window.clearTimeout(timer.current);
  }, [q]);

  function schedule(value: string) {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch(value), 300);
  }

  function toggle(status: ProjectStatus) {
    onStatuses(
      statuses.includes(status)
        ? statuses.filter((item) => item !== status)
        : PROJECT_STATUSES.filter(
            (item) => item === status || statuses.includes(item),
          ),
    );
  }

  return (
    <section
      aria-label="프로젝트 필터"
      className="flex flex-col gap-4 border border-line bg-surface p-3 sm:p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="project-search" className="text-ui font-medium">
            프로젝트명 검색
          </label>
          <input
            ref={input}
            id="project-search"
            type="search"
            defaultValue={q}
            placeholder="이름의 일부를 입력해 주세요."
            onChange={(event) => {
              if (!composing.current) schedule(event.target.value);
            }}
            onCompositionStart={() => {
              composing.current = true;
              window.clearTimeout(timer.current);
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              schedule(event.currentTarget.value);
            }}
            className={`${inputBase} mt-1.5`}
          />
        </div>

        <div className="min-w-0">
          <span className="text-ui font-medium" id="status-filter-label">
            상태
          </span>
          <div
            role="group"
            aria-labelledby="status-filter-label"
            className="mt-1.5 flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={statuses.length === 0}
              onClick={() => onStatuses([])}
              className={`h-10 rounded-[2px] border px-3 text-ui ${
                statuses.length === 0
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink hover:bg-accent-soft"
              }`}
            >
              전체
            </button>
            {PROJECT_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={statuses.includes(status)}
                onClick={() => toggle(status)}
                className={`h-10 rounded-[2px] border px-3 text-ui ${
                  statuses.includes(status)
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink hover:bg-accent-soft"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-3 lg:flex-nowrap">
          <div className="min-w-0 flex-1">
            <label htmlFor="created-from" className="text-ui font-medium">
              등록일 시작
            </label>
            <input
              id="created-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => onDate(event.target.value, to)}
              className={`${inputBase} mt-1.5`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="created-to" className="text-ui font-medium">
              등록일 끝
            </label>
            <input
              id="created-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => onDate(from, event.target.value)}
              className={`${inputBase} mt-1.5`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p aria-live="polite" className="text-ui text-muted tabular-nums">
          조건에 맞는 {total}개
        </p>
        <button
          type="button"
          onClick={onReset}
          className="h-9 rounded-[2px] border border-line px-3 text-ui text-ink hover:bg-accent-soft"
        >
          필터 초기화
        </button>
      </div>
    </section>
  );
}
