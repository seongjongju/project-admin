"use client";

import { useState } from "react";
import {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  isValidProjectUrl,
  type ProjectInput,
  type ProjectKind,
  type ProjectStatus,
} from "@/lib/store";
import { STATUS_META } from "./ProjectBadges";
import { CategoryField, StackField } from "./ProjectOptionFields";
import { inputBase } from "./formStyles";

export type ProjectDraft = Omit<ProjectInput, "kind"> & {
  kind: ProjectKind | "";
};

type ProjectFormProps = {
  initial: ProjectDraft;
  submitLabel: string;
  onSubmit: (input: ProjectInput) => Promise<void>;
  onCancel: () => void;
};

export default function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState<ProjectKind | "">(initial.kind);
  const [category, setCategory] = useState(initial.category);
  const [status, setStatus] = useState<ProjectStatus>(initial.status);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [summary, setSummary] = useState(initial.summary);
  const [role, setRole] = useState(initial.role);
  const [url, setUrl] = useState(initial.url);
  const [stacks, setStacks] = useState<string[]>(initial.stacks);
  const [memo, setMemo] = useState(initial.memo);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function changeKind(next: ProjectKind) {
    setKind(next);
    if (next === "개인") setCategory("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("프로젝트 이름을 입력해 주세요.");
      return;
    }
    if (!kind) {
      setError("프로젝트 유형을 선택해 주세요.");
      return;
    }
    if (endDate < startDate) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    if (!isValidProjectUrl(url)) {
      setError(
        "링크는 http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요.",
      );
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        kind,
        category: kind === "회사" ? category.trim() : "",
        status,
        startDate,
        endDate,
        summary: summary.trim(),
        role: role.trim(),
        url: url.trim(),
        memo: memo.trim(),
        stacks,
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
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <div>
        <label htmlFor="project-title" className="text-ui font-medium">
          이름 <span className="text-accent">*</span>
        </label>
        <input
          id="project-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 사내 어드민 리뉴얼"
          className={`${inputBase} mt-1.5`}
        />
      </div>

      <fieldset>
        <legend className="text-ui font-medium">
          유형 <span className="text-accent">*</span>
        </legend>
        <div className="mt-1.5 flex gap-2">
          {PROJECT_KINDS.map((option) => (
            <label
              key={option}
              className={`flex h-10 items-center gap-2 rounded-[2px] border px-3 text-ui ${
                kind === option
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink"
              }`}
            >
              <input
                type="radio"
                name="project-kind"
                value={option}
                checked={kind === option}
                onChange={() => changeKind(option)}
                className="h-4 w-4 accent-accent"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "회사" && (
        <CategoryField value={category} onChange={setCategory} />
      )}

      <fieldset>
        <legend className="text-ui font-medium">상태</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PROJECT_STATUSES.map((option) => (
            <label
              key={option}
              className={`flex h-10 items-center gap-2 rounded-[2px] border px-3 text-ui ${
                status === option
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink"
              }`}
            >
              <input
                type="radio"
                name="project-status"
                value={option}
                checked={status === option}
                onChange={() => setStatus(option)}
                className="h-4 w-4 accent-accent"
              />
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${STATUS_META[option].dot}`}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="project-start" className="text-ui font-medium">
            시작일 <span className="text-accent">*</span>
          </label>
          <input
            id="project-start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={`${inputBase} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="project-end" className="text-ui font-medium">
            종료일 <span className="text-accent">*</span>
          </label>
          <input
            id="project-end"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={`${inputBase} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="project-summary" className="text-ui font-medium">
          한 줄 소개
        </label>
        <textarea
          id="project-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={2}
          placeholder="어떤 작업인지 한 줄로 적어 두세요."
          className={`${inputBase} mt-1.5 resize-y`}
        />
      </div>

      <div>
        <label htmlFor="project-role" className="text-ui font-medium">
          내 역할
        </label>
        <input
          id="project-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          placeholder="예: 프론트엔드"
          className={`${inputBase} mt-1.5`}
        />
      </div>

      <div>
        <label htmlFor="project-url" className="text-ui font-medium">
          링크
        </label>
        <input
          id="project-url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://"
          className={`${inputBase} mt-1.5`}
        />
      </div>

      <StackField selected={stacks} onChange={setStacks} />

      <div>
        <label htmlFor="project-memo" className="text-ui font-medium">
          메모
        </label>
        <textarea
          id="project-memo"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          rows={3}
          placeholder="필요한 내용을 적어 두세요."
          className={`${inputBase} mt-1.5 resize-y`}
        />
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
