"use client";

import { useState } from "react";
import { formatRange } from "@/lib/date";
import type { Project } from "@/lib/store";
import { KindBadge } from "./ProjectBadges";

type ProjectDetailProps = {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  headingLevel?: "h1" | "h2";
  children?: React.ReactNode;
};

function Value({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 text-ui break-words">{children}</div>;
}

export default function ProjectDetail({
  project,
  onEdit,
  onDelete,
  headingLevel = "h2",
  children,
}: ProjectDetailProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const Heading = headingLevel;

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "삭제하지 못했습니다. 다시 시도해 주세요.",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={project.kind} />
        </div>
        <Heading className="text-title font-semibold tracking-[-0.01em] break-words">
          {project.title}
        </Heading>
        <p className="text-ui tabular-nums text-accent">
          {formatRange(project.startDate, project.endDate)}
        </p>
      </header>

      <Value>
        {project.memo ? (
          <span className="whitespace-pre-wrap text-ink/85">{project.memo}</span>
        ) : (
          "—"
        )}
      </Value>

      <dl className="border-t border-line">
        {project.kind === "회사" && (
          <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-ui text-muted">종류</dt>
            <dd>
              <Value>{project.category || "—"}</Value>
            </dd>
          </div>
        )}

        <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-ui text-muted">한 줄 소개</dt>
          <dd>
            <Value>{project.summary || "—"}</Value>
          </dd>
        </div>

        <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-ui text-muted">내 역할</dt>
          <dd>
            <Value>{project.role || "—"}</Value>
          </dd>
        </div>

        <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-ui text-muted">링크</dt>
          <dd>
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="text-ui break-all text-accent underline-offset-4 hover:underline"
              >
                {project.url}
              </a>
            ) : (
              <Value>—</Value>
            )}
          </dd>
        </div>

        <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-ui text-muted">사용 스택</dt>
          <dd>
            {project.stacks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {project.stacks.map((stack) => (
                  <span
                    key={stack}
                    className="rounded-[2px] bg-accent-soft px-2 py-0.5 text-ui text-accent"
                  >
                    {stack}
                  </span>
                ))}
              </div>
            ) : (
              <Value>—</Value>
            )}
          </dd>
        </div>

      </dl>

      {children}

      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}

      {onEdit && onDelete && (confirming ? (
        <div className="border-t border-line pt-4">
          <p className="text-ui text-ink">
            이 프로젝트를 삭제할까요? 목록에서도 사라지고 되돌릴 수 없습니다.
          </p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-11 rounded-[2px] px-3 text-ui font-medium text-muted hover:text-ink"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-11 rounded-[2px] bg-danger px-5 text-ui font-medium text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-11 rounded-[2px] px-3 text-ui font-medium text-danger hover:text-danger/80"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="h-11 rounded-[2px] bg-ink px-5 text-ui font-medium text-paper hover:bg-ink/85"
          >
            수정
          </button>
        </div>
      ))}
    </div>
  );
}
