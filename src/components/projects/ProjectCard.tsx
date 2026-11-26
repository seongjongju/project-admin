"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listProjectFiles,
  type Project,
  type ProjectFile,
  type ProjectStatus,
  type ScheduleInput,
} from "@/lib/store";
import { KindBadge, StatusBadgeMenu } from "./ProjectBadges";
import ProjectFiles from "./ProjectFiles";
import ProjectTimeline from "./ProjectTimeline";

type ProjectCardProps = {
  project: Project;
  detailHref: string;
  onChangeStatus: (status: ProjectStatus) => Promise<void>;
  onSaveSchedule: (projectId: string, input: ScheduleInput & { id?: string }) => void;
  onDeleteSchedule: (projectId: string, scheduleId: string) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ui text-muted">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-ui break-words">{children}</dd>
    </div>
  );
}

export default function ProjectCard({
  project,
  detailHref,
  onChangeStatus,
  onSaveSchedule,
  onDeleteSchedule,
}: ProjectCardProps) {
  const [memoOpen, setMemoOpen] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesError, setFilesError] = useState("");
  const memoId = `project-memo-${project.id}`;

  useEffect(() => {
    let active = true;
    listProjectFiles(project.id)
      .then((list) => {
        if (active) setFiles(list);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFilesError(
          err instanceof Error
            ? err.message
            : "첨부 파일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      });
    return () => {
      active = false;
    };
  }, [project.id]);

  return (
    <li className="border border-line bg-surface">
      <ProjectTimeline
        project={project}
        onSaveSchedule={onSaveSchedule}
        onDeleteSchedule={onDeleteSchedule}
      />
      <div className="flex flex-col gap-4 px-3 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={detailHref}
            className="min-w-0 text-name font-medium break-words hover:text-accent"
          >
            {project.title}
          </Link>
          <StatusBadgeMenu status={project.status} onChange={onChangeStatus} />
          <KindBadge kind={project.kind} />
          {project.kind === "회사" && project.category && (
            <span className="inline-flex items-center rounded-[2px] border border-line px-2 py-0.5 text-ui leading-tight text-muted">
              {project.category}
            </span>
          )}
          <Link
            href={detailHref}
            className="shrink-0 text-ui text-accent underline-offset-4 hover:underline"
          >
            상세보기 →
          </Link>
        </div>

        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Field label="한 줄 소개">{project.summary || "—"}</Field>
          <Field label="내 역할">{project.role || "—"}</Field>
          <Field label="링크">
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-accent underline-offset-4 hover:underline"
              >
                {project.url}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label="사용 스택">
            {project.stacks.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {project.stacks.map((stack) => (
                  <span
                    key={stack}
                    className="rounded-[2px] bg-accent-soft px-2 py-0.5 text-ui text-accent"
                  >
                    {stack}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Field>
        </dl>

        {filesError && (
          <p role="alert" className="text-ui text-danger">
            {filesError}
          </p>
        )}
        {files.length > 0 && <ProjectFiles files={files} compact />}

        {project.memo && (
          <div className="min-w-0">
            <button
              type="button"
              aria-expanded={memoOpen}
              aria-controls={memoId}
              onClick={() => setMemoOpen((open) => !open)}
              className="rounded-[2px] text-ui text-accent underline-offset-4 hover:underline"
            >
              {memoOpen ? "메모 접기 ▴" : "메모 보기 ▾"}
            </button>
            {memoOpen && (
              <p
                id={memoId}
                className="mt-2 whitespace-pre-wrap border-l-2 border-line py-1 pl-3 text-ui text-ink"
              >
                {project.memo}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
