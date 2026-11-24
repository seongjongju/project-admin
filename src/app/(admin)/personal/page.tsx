import { Suspense } from "react";
import ProjectsView from "@/components/projects/ProjectsView";

export default function PersonalProjectsPage() {
  return (
    <Suspense fallback={<p className="text-ui text-muted">불러오는 중…</p>}>
      <ProjectsView kind="개인" title="개인 프로젝트" />
    </Suspense>
  );
}
