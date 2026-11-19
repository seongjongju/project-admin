import type { ProjectKind, ProjectStatus } from "@/lib/store";

export const STATUS_META: Record<
  ProjectStatus,
  { bar: string; dot: string }
> = {
  진행예정: { bar: "bg-planned text-planned-ink", dot: "bg-planned-ink" },
  진행중: { bar: "bg-accent-soft text-accent", dot: "bg-accent" },
  완료: { bar: "bg-ink text-paper", dot: "bg-ink" },
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

export function KindBadge({ kind }: { kind: ProjectKind }) {
  return (
    <span className="inline-flex items-center rounded-[2px] border border-line bg-surface px-2 py-0.5 text-ui leading-tight text-muted">
      {kind}
    </span>
  );
}
