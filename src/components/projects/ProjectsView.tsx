"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatRange } from "@/lib/date";
import {
  PROJECT_STATUSES,
  listProjects,
  type Project,
  type ProjectKind,
  type ProjectStatus,
} from "@/lib/store";
import { KindBadge, StatusBadge } from "./ProjectBadges";

type ProjectsViewProps = {
  kind: ProjectKind;
  title: string;
};

export default function ProjectsView({ kind, title }: ProjectsViewProps) {
  const [tab, setTab] = useState<ProjectStatus>("진행예정");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => {
        if (!active) return;
        setProjects(data.filter((project) => project.kind === kind));
      })
      .catch(() => {
        if (!active) return;
        setError(
          "프로젝트 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        );
        setProjects([]);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  const visible = (projects ?? []).filter(
    (project) => project.status === tab,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header>
        <h1 className="text-title font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-2 text-ui text-muted">
          상태 탭으로만 나누어 봅니다.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="border-l-2 border-danger bg-surface py-2.5 pr-3 pl-3 text-ui text-danger"
        >
          {error}
        </p>
      )}

      <div>
        <div
          role="tablist"
          aria-label={`${title} 상태`}
          className="flex gap-6 border-b border-line"
        >
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={tab === status}
              onClick={() => setTab(status)}
              className={`-mb-px h-11 border-b-2 px-0.5 text-ui font-medium transition-colors ${
                tab === status
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {projects === null ? (
            <p className="py-16 text-center text-ui text-muted">
              불러오는 중…
            </p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-ui text-muted">
              {tab}인 {kind} 프로젝트가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex flex-col gap-1.5 py-5 sm:py-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-name font-medium break-words hover:text-accent">
                        {project.title}
                      </h2>
                      <KindBadge kind={project.kind} />
                      <StatusBadge status={project.status} />
                    </div>
                    {project.summary && (
                      <p className="text-ui break-words text-muted">
                        {project.summary}
                      </p>
                    )}
                    <p className="text-ui tabular-nums text-muted">
                      {formatRange(project.startDate, project.endDate)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
