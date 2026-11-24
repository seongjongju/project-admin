"use client";

import { useState } from "react";
import { PROJECT_STATUSES, type ScheduleInput } from "@/lib/store";
import { inputBase } from "./formStyles";

type Props = {
  initial: ScheduleInput;
  submitLabel: string;
  onSubmit: (input: ScheduleInput) => Promise<void>;
  onCancel: () => void;
};

/** 일정 추가·수정 팝업. 제목·시작날짜·끝날짜·상태만 받는다. */
export default function ScheduleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial.title);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [status, setStatus] = useState(initial.status);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("일정 제목을 입력해 주세요.");
      return;
    }
    if (!startDate || !endDate) {
      setError("시작날짜와 끝날짜를 입력해 주세요.");
      return;
    }
    if (endDate < startDate) {
      setError("끝날짜는 시작날짜보다 빠를 수 없습니다.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        startDate,
        endDate,
        status,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "저장하지 못했습니다. 다시 시도해 주세요.",
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="schedule-title" className="text-ui font-medium">
          일정 제목 <span className="text-accent">*</span>
        </label>
        <input
          id="schedule-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 메인페이지 작업"
          className={`${inputBase} mt-1.5`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="schedule-start" className="text-ui font-medium">
            시작날짜 <span className="text-accent">*</span>
          </label>
          <input
            id="schedule-start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={`${inputBase} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="schedule-end" className="text-ui font-medium">
            끝날짜 <span className="text-accent">*</span>
          </label>
          <input
            id="schedule-end"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={`${inputBase} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="schedule-status" className="text-ui font-medium">
          상태
        </label>
        <select
          id="schedule-status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ScheduleInput["status"])
          }
          className={`${inputBase} mt-1.5`}
        >
          {PROJECT_STATUSES.map((option) => (
            <option key={option} value={option} className="bg-surface text-ink">
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-[2px] px-3 text-ui font-medium text-muted hover:text-ink"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-[2px] bg-ink px-5 text-ui font-medium text-paper hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
