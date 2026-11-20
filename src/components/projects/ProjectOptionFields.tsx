"use client";

import { useEffect, useState } from "react";
import {
  addCategory,
  addStack,
  listCategories,
  listStacks,
  type Option,
} from "@/lib/store";
import { inputBase } from "./formStyles";

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "저장하지 못했습니다. 다시 시도해 주세요.";
}

export function CategoryField({
  value,
  onChange,
}: {
  value: string; // 종류 id
  onChange: (id: string) => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listCategories()
      .then(setOptions)
      .catch((err) => setError(messageOf(err)));
  }, []);

  async function add() {
    if (pending) return;
    setPending(true);
    try {
      const option = await addCategory(name);
      setOptions((previous) =>
        previous.some((item) => item.id === option.id)
          ? previous
          : [...previous, option].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onChange(option.id);
      setName("");
      setError("");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <label htmlFor="project-category" className="text-ui font-medium">
        종류
      </label>
      <select
        id="project-category"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputBase} mt-1.5`}
      >
        <option value="">선택 안 함</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      <label
        htmlFor="new-category"
        className="mt-2 block text-ui text-muted"
      >
        목록에 없으면 직접 입력
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="new-category"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          placeholder="예: 쇼핑몰"
          className={inputBase}
        />
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="h-11 shrink-0 rounded-[2px] border border-line px-3 text-ui text-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          추가
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-ui text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function StackField({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (stacks: string[]) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listStacks()
      .then(setOptions)
      .catch((err) => setError(messageOf(err)));
  }, []);

  function select(stack: string) {
    if (selected.some((item) => item === stack)) return;
    onChange([...selected, stack]);
  }

  async function add() {
    if (pending) return;
    setPending(true);
    try {
      const canonical = await addStack(name);
      setOptions((previous) =>
        previous.some((item) => item === canonical)
          ? previous
          : [...previous, canonical],
      );
      select(canonical);
      setName("");
      setError("");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  const available = options.filter((option) => !selected.includes(option));

  return (
    <fieldset>
      <legend className="text-ui font-medium">사용 스택</legend>

      <label
        htmlFor="project-stack"
        className="mt-1.5 block text-ui text-muted"
      >
        저장된 스택에서 선택
      </label>
      <select
        id="project-stack"
        value=""
        onChange={(event) => {
          if (event.target.value) select(event.target.value);
        }}
        className={`${inputBase} mt-1`}
      >
        <option value="">스택 선택</option>
        {available.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((stack) => (
            <button
              key={stack}
              type="button"
              onClick={() =>
                onChange(selected.filter((item) => item !== stack))
              }
              aria-label={`${stack} 선택 해제`}
              className="inline-flex items-center gap-1 rounded-[2px] bg-accent-soft px-2 py-1 text-ui text-accent hover:bg-accent-soft/70"
            >
              {stack}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <label htmlFor="new-stack" className="mt-2 block text-ui text-muted">
        목록에 없으면 직접 입력
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="new-stack"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          placeholder="예: React"
          className={inputBase}
        />
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="h-11 shrink-0 rounded-[2px] border border-line px-3 text-ui text-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          추가
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-ui text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
