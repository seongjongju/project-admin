"use client";

import { useEffect, useState } from "react";

/** 스크롤이 내려가면 나타나는 맨 위 이동 버튼. */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 320);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function moveToTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={moveToTop}
      aria-label="맨 위로 이동"
      className="fixed right-4 bottom-4 z-40 flex h-11 w-11 items-center justify-center rounded-[2px] border border-line bg-surface text-ink hover:bg-accent-soft hover:text-accent sm:right-6 sm:bottom-6"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}
