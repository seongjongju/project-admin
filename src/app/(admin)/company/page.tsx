import { Suspense } from "react";
import ProjectsView from "@/components/projects/ProjectsView";

export default function CompanyProjectsPage() {
  return (
    <Suspense fallback={<p className="text-ui text-muted">불러오는 중…</p>}>
      <ProjectsView kind="회사" title="회사 프로젝트" />
    </Suspense>
  );
}
