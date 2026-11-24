import { Suspense } from "react";
import ProjectDetailPage from "@/components/projects/ProjectDetailPage";

// usePathname()을 쓰는 LNB가 이 동적 경로를 막지 않도록 서버에서 먼저 렌더한다.
export const instant = false;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-ui text-muted">불러오는 중…</p>}>
      <ProjectDetailPage key={id} id={id} />
    </Suspense>
  );
}
