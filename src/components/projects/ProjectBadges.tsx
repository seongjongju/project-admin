"use client";

import { useEffect, useRef, useState } from "react";
import { PROJECT_STATUSES, type ProjectKind, type ProjectStatus } from "@/lib/store";

/** 색 값은 globals.css의 --color-status-* 토큰에만 있다. 여기는 이름 매핑뿐. */
export const STATUS_META: Record<
  ProjectStatus,
  { bar: string; dot: string }
> = {
  진행예정: {
    bar: "bg-status-planned text-status-planned-ink",
    dot: "bg-status-planned",
  },
  진행중: {
    bar: "bg-status-active text-status-active-ink",
    dot: "bg-status-active",
  },
  완료: { bar: "bg-status-done text-status-done-ink", dot: "bg-status-done" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-ui leading-tight ${STATUS_META[status].bar}`}
    >
      {status}
    </span>
  );
}

/** 프로젝트 상태 뱃지. 일정 바의 상태와 달리 프로젝트 전체 상태를 바꾼다. */
export function StatusBadgeMenu({
  status,
  onChange,
}: {
  status: ProjectStatus;
  onChange: (status: ProjectStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function choose(next: ProjectStatus) {
    if (next === status) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      await onChange(next);
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`프로젝트 상태 ${status}. 누르면 변경`}
        disabled={saving}
        onClick={() => {
          setFailed(false);
          setOpen((value) => !value);
        }}
        className="inline-flex items-center gap-1 rounded-[2px] disabled:opacity-60"
      >
        <StatusBadge status={status} />
        <span aria-hidden className="text-ui text-muted">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="프로젝트 상태 선택"
          className="absolute top-full left-0 z-20 mt-1 w-28 border border-line bg-surface p-1"
        >
          {PROJECT_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              aria-current={option === status}
              disabled={saving}
              onClick={() => void choose(option)}
              className={`block w-full px-2 py-1.5 text-left text-ui hover:bg-accent-soft disabled:opacity-60 ${
                option === status ? "font-medium text-accent" : "text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {failed && (
        <p role="alert" className="absolute top-full left-0 z-20 mt-1 w-52 text-ui text-danger">
          상태를 저장하지 못했습니다. 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}

export function KindBadge({ kind }: { kind: ProjectKind }) {
  return (
    <span className="inline-flex items-center rounded-[2px] border border-line bg-surface px-2 py-0.5 text-ui leading-tight text-muted">
      {kind}
    </span>
  );
}
