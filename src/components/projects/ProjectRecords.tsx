"use client";

import { useState } from "react";
import { newId, type Project } from "@/lib/store";
import { inputBase } from "./formStyles";

type Pair = { id: string; values: [string, string] };
type Draft = { id: string; isNew: boolean; values: [string, string] };

type SectionProps = {
  idPrefix: string;
  heading: string;
  emptyText: string;
  labels: [string, string];
  items: Pair[];
  onSave: (items: Pair[]) => Promise<void>;
};

const actionBase =
  "flex h-10 items-center rounded-[2px] px-3 text-ui font-medium disabled:cursor-not-allowed disabled:opacity-50";

function RecordSection({
  idPrefix,
  heading,
  emptyText,
  labels,
  items,
  onSave,
}: SectionProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [confirming, setConfirming] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setValue(id: string, index: 0 | 1, value: string) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              values:
                index === 0
                  ? [value, draft.values[1]]
                  : [draft.values[0], value],
            }
          : draft,
      ),
    );
  }

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "저장하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  function add() {
    setError("");
    setConfirming("");
    setDrafts((current) => [
      ...current,
      { id: newId(), isNew: true, values: ["", ""] },
    ]);
  }

  function edit(item: Pair) {
    setError("");
    setConfirming("");
    setDrafts((current) =>
      current.some((draft) => draft.id === item.id)
        ? current
        : [...current, { id: item.id, isNew: false, values: item.values }],
    );
  }

  function complete(draft: Draft) {
    if (!draft.values[0].trim() && !draft.values[1].trim()) {
      setError("두 칸이 모두 비어 있어요. 최소 한 칸은 입력해 주세요.");
      return;
    }

    const next = draft.isNew
      ? [...items, { id: draft.id, values: draft.values }]
      : items.map((item) =>
          item.id === draft.id ? { id: item.id, values: draft.values } : item,
        );

    run(async () => {
      await onSave(next);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
    });
  }

  function discard(id: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    setConfirming("");
  }

  function requestRemove(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (draft && !draft.values[0].trim() && !draft.values[1].trim()) {
      discard(id);
      return;
    }
    setConfirming(id);
  }

  function remove(id: string) {
    if (drafts.some((draft) => draft.id === id)) {
      discard(id);
      return;
    }
    run(async () => {
      await onSave(items.filter((item) => item.id !== id));
      setConfirming("");
    });
  }

  const rows: { item: Pair; draft?: Draft; index: number }[] = items.map(
    (item, index) => ({
      item,
      draft: drafts.find((draft) => draft.id === item.id),
      index,
    }),
  );
  for (const draft of drafts.filter(
    (draft) => draft.isNew && !items.some((item) => item.id === draft.id),
  )) {
    rows.push({ item: { id: draft.id, values: draft.values }, draft, index: rows.length });
  }

  return (
    <section className="border-t border-line pt-6">
      <h2 className="text-section font-medium">{heading}</h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-ui text-muted">{emptyText}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map(({ item, draft, index }) => {
            const name = `${labels[0]} ${index + 1}`;
            return (
              <div key={item.id} className="border border-line p-4">
                {draft ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {labels.map((label, field) => {
                      const fieldId = `${idPrefix}-${index}-${field}`;
                      return (
                        <div key={fieldId}>
                          <label htmlFor={fieldId} className="text-ui text-muted">
                            {label} {index + 1}
                          </label>
                          <textarea
                            id={fieldId}
                            value={draft.values[field]}
                            onChange={(event) =>
                              setValue(
                                item.id,
                                field as 0 | 1,
                                event.target.value,
                              )
                            }
                            rows={3}
                            autoFocus={draft.isNew && field === 0}
                            className={`${inputBase} mt-1 min-h-24 resize-y`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {labels.map((label, field) => (
                      <div key={label} className="min-w-0">
                        <p className="text-ui text-muted">{label}</p>
                        <p
                          className={`mt-1 text-ui break-words whitespace-pre-wrap ${
                            item.values[field] ? "" : "text-muted"
                          }`}
                        >
                          {item.values[field] || "아직 작성하지 않았어요"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {confirming === item.id ? (
                    <>
                      <span className="text-ui text-danger">삭제할까요?</span>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        disabled={saving}
                        aria-label={`${name} 삭제 확인`}
                        className={`${actionBase} bg-danger text-white hover:bg-danger/90`}
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming("")}
                        aria-label={`${name} 삭제 취소`}
                        className={`${actionBase} text-muted hover:text-ink`}
                      >
                        취소
                      </button>
                    </>
                  ) : draft ? (
                    <>
                      <button
                        type="button"
                        onClick={() => complete(draft)}
                        disabled={saving}
                        aria-label={`${name} 완료`}
                        className={`${actionBase} bg-accent text-white hover:bg-accent/90`}
                      >
                        완료
                      </button>
                      <button
                        type="button"
                        onClick={() => requestRemove(item.id)}
                        aria-label={`${name} 삭제`}
                        className={`${actionBase} text-danger hover:text-danger/80`}
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => edit(item)}
                        aria-label={`${name} 수정`}
                        className={`${actionBase} border border-line text-ink hover:bg-accent-soft`}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => requestRemove(item.id)}
                        aria-label={`${name} 삭제`}
                        className={`${actionBase} text-danger hover:text-danger/80`}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-ui text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={add}
        aria-label={`${heading} 추가`}
        className="mt-3 h-10 rounded-[2px] border border-line px-3 text-ui font-medium text-accent hover:bg-accent-soft"
      >
        + 추가
      </button>
    </section>
  );
}

export default function ProjectRecords({
  project,
  onSave,
}: {
  project: Project;
  onSave: (
    records: Partial<Pick<Project, "troubles" | "learnings">>,
  ) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-8">
      <RecordSection
        idPrefix="trouble"
        heading="트러블슈팅 + 해결방법"
        emptyText="아직 기록한 트러블슈팅이 없어요. 겪은 문제와 해결 방법을 남겨 보세요."
        labels={["트러블슈팅", "해결방법"]}
        items={project.troubles.map(({ id, trouble, solution }) => ({
          id,
          values: [trouble, solution],
        }))}
        onSave={(items) =>
          onSave({
            troubles: items.map(({ id, values }) => ({
              id,
              trouble: values[0],
              solution: values[1],
            })),
          })
        }
      />

      <RecordSection
        idPrefix="learning"
        heading="몰랐던 점 + 배운점"
        emptyText="아직 기록한 내용이 없어요. 새로 알게 된 점을 남겨 보세요."
        labels={["몰랐던 점", "배운점"]}
        items={project.learnings.map(({ id, unknown, learned }) => ({
          id,
          values: [unknown, learned],
        }))}
        onSave={(items) =>
          onSave({
            learnings: items.map(({ id, values }) => ({
              id,
              unknown: values[0],
              learned: values[1],
            })),
          })
        }
      />
    </div>
  );
}
