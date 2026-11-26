"use client";

import { useId, useState } from "react";
import {
  formatFileSize,
  MAX_FILE_COUNT,
  validateFiles,
} from "@/lib/files";
import type { ProjectFile } from "@/lib/store";
import FileThumb from "./FileThumb";
import ImagePreviewModal from "./ImagePreviewModal";

export type AttachmentChanges = {
  added: (File | null)[];
  removedIds: string[];
};

type FileAttachFieldProps = {
  initialFiles: ProjectFile[];
  changes: AttachmentChanges;
  onChange: (
    next: AttachmentChanges | ((prev: AttachmentChanges) => AttachmentChanges),
  ) => void;
};

export default function FileAttachField({
  initialFiles,
  changes,
  onChange,
}: FileAttachFieldProps) {
  const uid = useId();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ name: string; src: string } | null>(
    null,
  );
  const count =
    initialFiles.filter((file) => !changes.removedIds.includes(file.id)).length +
    changes.added.length;

  function setAdded(added: (File | null)[]) {
    setError(
      validateFiles(added.filter((file): file is File => Boolean(file))),
    );
    onChange((prev) => ({ ...prev, added }));
  }

  function toggleRemoved(id: string) {
    setError("");
    onChange((prev) => ({
      ...prev,
      removedIds: prev.removedIds.includes(id)
        ? prev.removedIds.filter((item) => item !== id)
        : [...prev.removedIds, id],
    }));
  }

  function addRow() {
    if (count >= MAX_FILE_COUNT) return;
    setError("");
    onChange((prev) => ({ ...prev, added: [...prev.added, null] }));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ui font-medium">첨부 파일</span>
        <span className="text-ui tabular-nums text-muted">
          {count}/{MAX_FILE_COUNT}
        </span>
      </div>
      <p className="mt-1 text-ui text-muted">
        이미지·문서·압축파일을 올릴 수 있습니다. 파일당 10MB까지.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {initialFiles.map((file) => {
          const removed = changes.removedIds.includes(file.id);
          return (
            <li
              key={file.id}
              className="flex min-h-11 items-center gap-3 rounded-[2px] border border-line bg-surface px-3 py-2"
            >
              <FileThumb
                name={file.name}
                path={file.path}
                onPreview={(src) => setPreview({ name: file.name, src })}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-ui ${removed ? "text-muted line-through" : "text-ink"}`}
                >
                  {file.name}
                </span>
                <span className="block text-ui text-muted">
                  {formatFileSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => toggleRemoved(file.id)}
                aria-label={`${file.name} ${removed ? "첨부 되돌리기" : "첨부 삭제"}`}
                className="shrink-0 px-2 text-ui text-danger hover:underline"
              >
                {removed ? "되돌리기" : "삭제"}
              </button>
            </li>
          );
        })}

        {changes.added.map((file, index) => {
          const inputId = `${uid}-file-${index}`;
          return (
            <li
              key={inputId}
              className="flex min-h-11 items-center gap-3 rounded-[2px] border border-line bg-surface px-3 py-2 focus-within:border-accent"
            >
              <input
                id={inputId}
                type="file"
                className="sr-only"
                onChange={(event) => {
                  const next = [...changes.added];
                  next[index] = event.target.files?.[0] ?? null;
                  setAdded(next);
                }}
              />
              <label
                htmlFor={inputId}
                className="flex min-h-11 shrink-0 items-center rounded-[2px] border border-accent px-3 text-ui font-medium text-accent"
              >
                파일 첨부
              </label>
              <FileThumb
                name={file?.name ?? ""}
                file={file ?? undefined}
                onPreview={(src) =>
                  file && setPreview({ name: file.name, src })
                }
              />
              <span className="min-w-0 flex-1">
                {file ? (
                  <>
                    <span className="block truncate text-ui text-ink">
                      {file.name}
                    </span>
                    <span className="block text-ui text-muted">
                      {formatFileSize(file.size)}
                    </span>
                  </>
                ) : (
                  <span className="block text-ui text-muted">
                    파일을 선택해 주세요.
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    added: prev.added.filter((_, i) => i !== index),
                  }))
                }
                aria-label={`${index + 1}번 첨부 입력 삭제`}
                className="shrink-0 px-2 text-ui text-muted hover:text-danger"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={addRow}
        disabled={count >= MAX_FILE_COUNT}
        className="mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-[2px] border border-dashed border-line text-ui font-medium text-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">+</span> 파일 첨부 추가
      </button>

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
    </div>
  );
}
