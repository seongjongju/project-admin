"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const menus = [
  { href: "/", label: "홈" },
  { href: "/company", label: "회사 프로젝트" },
  { href: "/personal", label: "개인 프로젝트" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴" className="mt-8 flex flex-col">
      {menus.map((menu) => {
        const active = pathname === menu.href;
        return (
          <Link
            key={menu.href}
            href={menu.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center border-l-2 pl-3 text-ui transition-colors ${
              active
                ? "border-accent font-medium text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {menu.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 좁은 화면에서 연 채로 창을 넓히면 닫아서 스크롤 잠금이 남지 않게 한다.
    const desktop = window.matchMedia("(min-width: 768px)");
    function handleDesktop(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    desktop.addEventListener("change", handleDesktop);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", handleDesktop);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm md:hidden">
        <Link href="/" className="text-ui font-medium">
          프로젝트 기록장
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="flex h-9 items-center gap-1.5 rounded-[2px] px-2.5 text-ui text-muted hover:bg-accent-soft hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          메뉴
        </button>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/25 md:hidden"
            aria-hidden="true"
            onClick={closeDrawer}
          />
          <aside
            aria-label="모바일 메뉴"
            className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-line bg-paper px-4 py-4 md:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-ui font-medium">프로젝트 기록장</span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="메뉴 닫기"
                className="flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-accent-soft hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <NavLinks onNavigate={closeDrawer} />
          </aside>
        </>
      )}

      <aside className="hidden w-[200px] shrink-0 border-r border-line bg-paper px-4 py-6 md:sticky md:top-0 md:flex md:h-dvh md:flex-col">
        <Link href="/" className="px-3 text-ui font-medium">
          프로젝트 기록장
        </Link>
        <NavLinks />
      </aside>
    </>
  );
}
