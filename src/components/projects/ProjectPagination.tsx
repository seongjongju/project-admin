"use client";

import { pageWindow } from "@/lib/store";

type ProjectPaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export default function ProjectPagination({
  page,
  totalPages,
  onChange,
}: ProjectPaginationProps) {
  if (totalPages <= 1) return null;

  const move = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    onChange(next);
  };

  return (
    <nav aria-label="프로젝트 목록 페이지" className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => move(page - 1)}
        className="h-10 rounded-[2px] border border-line px-3 text-ui text-ink hover:bg-accent-soft disabled:opacity-40"
      >
        이전
      </button>
      {pageWindow(page, totalPages).map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-ui text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            aria-label={`${item}페이지`}
            onClick={() => move(item)}
            className={`h-10 min-w-10 rounded-[2px] border px-2 text-ui tabular-nums ${
              item === page
                ? "border-accent bg-accent text-paper"
                : "border-line text-ink hover:bg-accent-soft"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => move(page + 1)}
        className="h-10 rounded-[2px] border border-line px-3 text-ui text-ink hover:bg-accent-soft disabled:opacity-40"
      >
        다음
      </button>
    </nav>
  );
}
