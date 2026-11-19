import Link from "next/link";
import { toDateKey } from "@/lib/date";
import type { Project, ProjectStatus } from "@/lib/store";
import { KindBadge } from "./ProjectBadges";

type Group = {
  status: ProjectStatus;
  heading: string;
  empty: string;
  dateField: "startDate" | "endDate";
  newestFirst: boolean;
};

const GROUPS: Group[] = [
  {
    status: "진행예정",
    heading: "이번 달 진행예정 프로젝트",
    empty: "이번 달에 시작 예정인 진행예정 프로젝트가 없습니다.",
    dateField: "startDate",
    newestFirst: false,
  },
  {
    status: "진행중",
    heading: "이번 달 진행 프로젝트",
    empty: "이번 달에 시작한 진행중 프로젝트가 없습니다.",
    dateField: "startDate",
    newestFirst: false,
  },
  {
    status: "완료",
    heading: "이번 달 완료 프로젝트",
    empty: "이번 달에 끝난 완료 프로젝트가 없습니다.",
    dateField: "endDate",
    newestFirst: true,
  },
];

function ProjectLink({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      title={project.title}
      className="flex h-[var(--month-list-row)] items-center justify-between gap-2 border-b border-line last:border-b-0 hover:text-accent"
    >
      <span className="text-ui min-w-0 truncate font-medium">{project.title}</span>
      <span className="shrink-0">
        <KindBadge kind={project.kind} />
      </span>
    </Link>
  );
}

export default function MonthlyProjects({ projects }: { projects: Project[] }) {
  const now = new Date();
  const monthStart = toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  return (
    <section className="border-t border-line pt-8">
      <h2 className="text-section font-medium">이번 달 프로젝트</h2>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        {GROUPS.map((group) => {
          const items = projects
            .filter(
              (project) =>
                project.status === group.status &&
                project[group.dateField] >= monthStart &&
                project[group.dateField] <= monthEnd,
            )
            .sort((a, b) =>
              group.newestFirst
                ? b[group.dateField].localeCompare(a[group.dateField])
                : a[group.dateField].localeCompare(b[group.dateField]),
            );

          return (
            <div
              key={group.status}
              className="min-w-0 flex-1 border border-line bg-surface p-4"
            >
              <h3 className="text-ui font-medium">{group.heading}</h3>
              {items.length === 0 ? (
                <p className="mt-2 text-ui text-muted">{group.empty}</p>
              ) : (
                <div
                  tabIndex={0}
                  role="group"
                  aria-label={`${group.heading} 목록`}
                  className="mt-1 max-h-[calc(var(--month-list-row)*var(--month-list-rows))] overflow-y-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {items.map((project) => (
                    <ProjectLink key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
