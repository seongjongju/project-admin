"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  deleteProject,
  deleteProjectFiles,
  getProject,
  listProjectFiles,
  saveProjectRecords,
  updateProject,
  uploadProjectFiles,
  type Project,
  type ProjectFile,
  type ProjectInput,
} from "@/lib/store";
import type { AttachmentChanges } from "./FileAttachField";
import ProjectDetail from "./ProjectDetail";
import ProjectFiles from "./ProjectFiles";
import ProjectForm from "./ProjectForm";
import ProjectRecords from "./ProjectRecords";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
}

export default function ProjectDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileError, setFileError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    getProject(id)
      .then((data) => {
        if (active) setProject(data);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "프로젝트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      });
    // 파일은 별도로 읽는다. 첨부 기능 SQL을 안 넣은 DB에서도 프로젝트는 보이게 한다.
    listProjectFiles(id)
      .then((data) => {
        if (active) {
          setFiles(data);
          setFileError("");
        }
      })
      .catch((err) => {
        if (active) setFileError(messageOf(err));
      });
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  // 목록에서 넘어온 필터·페이지를 그대로 들고 돌아간다.
  const listQuery = searchParams.toString();
  const listHref = `${project?.kind === "개인" ? "/personal" : "/company"}${
    listQuery ? `?${listQuery}` : ""
  }`;

  async function handleEdit(
    input: ProjectInput,
    attachments: AttachmentChanges,
  ) {
    if (!project) return;
    const next = await updateProject(project.id, input);
    await deleteProjectFiles(attachments.removedIds);
    await uploadProjectFiles(project.id, attachments.added);
    setProject(next);
    setFiles(await listProjectFiles(project.id));
    setEditing(false);
  }

  async function handleDeleteFile(file: ProjectFile) {
    await deleteProjectFiles([file.id]);
    setFiles((current) => current.filter((item) => item.id !== file.id));
  }

  async function handleDelete() {
    if (!project) return;
    await deleteProject(project.id);
    router.push(listHref);
  }

  async function handleRecords(
    records: Partial<Pick<Project, "troubles" | "learnings">>,
  ) {
    if (!project) return;
    setProject(await saveProjectRecords(project.id, records));
  }

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 py-16">
        <p role="alert" className="text-ui text-danger">
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoadError("");
            setProject(undefined);
            setReloadKey((key) => key + 1);
          }}
          className="h-11 rounded-[2px] border border-line px-4 text-ui font-medium text-ink hover:bg-accent-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (project === undefined) {
    return (
      <p className="mx-auto w-full max-w-4xl py-16 text-center text-ui text-muted">
        불러오는 중…
      </p>
    );
  }

  if (project === null) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 py-16">
        <p className="text-ui text-ink">프로젝트를 찾을 수 없습니다.</p>
        <p className="text-ui text-muted">
          삭제되었거나 주소가 올바르지 않습니다.
        </p>
        <div className="flex flex-wrap gap-4 text-ui">
          <Link href="/company" className="text-accent hover:underline">
            회사 프로젝트
          </Link>
          <Link href="/personal" className="text-accent hover:underline">
            개인 프로젝트
          </Link>
          <Link href="/" className="text-muted hover:text-ink">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <Link href={listHref} className="text-ui text-muted hover:text-ink">
        ← 목록으로 돌아가기
      </Link>

      <ProjectDetail
        project={project}
        headingLevel="h1"
        onEdit={() => setEditing(true)}
        onDelete={handleDelete}
      >
        <ProjectFiles files={files} onDelete={handleDeleteFile} />
        {fileError && (
          <p role="alert" className="text-ui text-danger">
            {fileError}
          </p>
        )}
        <ProjectRecords project={project} onSave={handleRecords} />
      </ProjectDetail>

      {editing && (
        <Modal
          title="프로젝트 수정"
          onClose={() => setEditing(false)}
        >
          <ProjectForm
            initial={project}
            lockedKind={project.kind}
            submitLabel="저장"
            initialFiles={files}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </div>
  );
}
