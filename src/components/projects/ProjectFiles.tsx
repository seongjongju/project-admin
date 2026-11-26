"use client";

import { useEffect, useId, useState } from "react";
import { formatFileSize } from "@/lib/files";
import {
  getProjectFileUrls,
  withDownloadName,
  type ProjectFile,
} from "@/lib/store";
import FileThumb from "./FileThumb";
import ImagePreviewModal from "./ImagePreviewModal";

type ProjectFilesProps = {
  files: ProjectFile[];
  onDelete?: (file: ProjectFile) => Promise<void>;
  compact?: boolean; // 목록 카드에서는 3개까지만 보여주고 나머지는 접는다.
};

const VISIBLE_WHEN_COMPACT = 3;

export default function ProjectFiles({
  files,
  onDelete,
  compact = false,
}: ProjectFilesProps) {
  const listId = useId();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<{ name: string; src: string } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    getProjectFileUrls(files.map((file) => file.path))
      .then((list) => {
        if (!active) return;
        setUrls(
          Object.fromEntries(
            files.map((file, index) => [file.id, list[index] ?? ""]),
          ),
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "파일 주소를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      });
    return () => {
      active = false;
    };
  }, [files]);

  async function handleDelete(file: ProjectFile) {
    if (!onDelete) return;
    if (!window.confirm(`"${file.name}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setError("");
    setDeletingId(file.id);
    try {
      await onDelete(file);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "파일을 삭제하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setDeletingId("");
    }
  }

  const visibleFiles =
    compact && !expanded ? files.slice(0, VISIBLE_WHEN_COMPACT) : files;

  return (
    <section className={compact ? "min-w-0" : "border-t border-line pt-5"}>
      <h2
        className={
          compact ? "text-ui font-medium" : "text-section font-medium"
        }
      >
        첨부 파일
      </h2>
      {files.length === 0 ? (
        <p className="mt-2 text-ui text-muted">첨부한 파일이 없습니다.</p>
      ) : (
        <ul id={listId} className="mt-3 flex flex-col gap-2">
          {visibleFiles.map((file) => {
            const url = urls[file.id] ?? "";
            const downloadUrl = url
              ? withDownloadName(url, file.name)
              : undefined;
            return (
              <li
                key={file.id}
                className="flex min-h-11 items-center gap-3 rounded-[2px] border border-line bg-surface px-3 py-2"
              >
                <FileThumb
                  name={file.name}
                  src={url}
                  onPreview={(src) => setPreview({ name: file.name, src })}
                />
                <a
                  href={downloadUrl}
                  download={file.name}
                  aria-label={`${file.name} 다운로드`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <span className="block truncate text-ui text-accent">
                    {file.name}
                  </span>
                  <span className="block text-ui text-muted">
                    {formatFileSize(file.size)}
                  </span>
                </a>
                <a
                  href={downloadUrl}
                  download={file.name}
                  aria-label={`${file.name} 다운로드`}
                  className="shrink-0 px-2 text-ui text-accent hover:underline"
                >
                  다운로드
                </a>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                    className="shrink-0 px-2 text-ui text-danger hover:underline disabled:opacity-50"
                  >
                    {deletingId === file.id ? "삭제 중…" : "삭제"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {compact && files.length > VISIBLE_WHEN_COMPACT && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 rounded-[2px] text-ui text-accent underline-offset-4 hover:underline"
        >
          {expanded ? "첨부파일 접기 ▴" : "첨부파일 더보기 ▾"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-ui text-danger">
          {error}
        </p>
      )}
      {preview && (
        <ImagePreviewModal
          name={preview.name}
          src={preview.src}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
