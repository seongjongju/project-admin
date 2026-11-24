"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toSeoulDateKey } from "@/lib/date";
import {
  markAsked,
  NOTIFICATION_TITLE,
  readAsked,
  reminderKey,
  reminderMessage,
  reminderTargets,
  REMINDER_DELAY_MS,
} from "@/lib/notification";
import { listProjects } from "@/lib/store";

type Permission = "checking" | "default" | "granted" | "denied" | "unsupported";

/** 대시보드 헤더에만 마운트한다. 버튼과 10분 타이머를 함께 관리한다. */
export default function ProjectReminder() {
  const router = useRouter();
  const [permission, setPermission] = useState<Permission>("checking");

  useEffect(() => {
    // 서버에는 Notification이 없어 초기값을 같게 두고, 마운트 뒤 실제 권한을 읽는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission,
    );
  }, []);

  const enable = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      // 권한 요청이 막힌 브라우저는 조용히 넘어간다.
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    let active = true;

    async function notify() {
      try {
        const today = toSeoulDateKey(new Date());
        const key = reminderKey(today);
        if (readAsked(key)) return;

        const message = reminderMessage(
          reminderTargets(await listProjects(), today),
        );
        if (!message || !active) return;

        try {
          const notification = new Notification(NOTIFICATION_TITLE, {
            body: message,
          });
          notification.onclick = () => {
            window.focus();
            router.push("/");
          };
          markAsked(key);
        } catch {
          // 알림을 만들 수 없는 브라우저에서는 조용히 넘어간다.
        }
      } catch {
        // 알림 조회 실패는 사용 중인 화면에 영향을 주지 않는다.
      }
    }

    const timer = window.setTimeout(() => {
      void notify();
    }, REMINDER_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [permission, router]);

  if (permission !== "default") return null;

  return (
    <button
      type="button"
      onClick={() => void enable()}
      className="h-9 shrink-0 rounded-[2px] border border-line px-3 text-ui text-muted hover:border-accent hover:text-accent"
    >
      알림 켜기
    </button>
  );
}
