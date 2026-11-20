"use client";

import { useEffect } from "react";
import { toDateKey } from "@/lib/date";
import {
  markAsked,
  PERMISSION_KEY,
  readAsked,
  reminderKeys,
  reminderMessage,
  reminderTargets,
  REMINDER_DELAY_MS,
} from "@/lib/notification";
import { listProjects } from "@/lib/store";

/** 로그인 후 영역에 한 번만 마운트한다. 화면에는 아무것도 그리지 않는다. */
export default function ProjectReminder() {
  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function notify() {
      try {
        const projects = await listProjects();
        const today = toDateKey(new Date());
        const targets = reminderTargets(projects, today);
        const keys = reminderKeys(today);

        (["start", "end"] as const).forEach((condition) => {
          const message = reminderMessage(condition, targets[condition]);
          if (!message || readAsked(keys[condition])) return;
          try {
            new Notification("프로젝트 기록장", { body: message });
            markAsked(keys[condition]);
          } catch {
            // 알림을 만들 수 없는 브라우저에서는 조용히 넘어간다.
          }
        });
      } catch {
        // 알림 조회 실패는 사용 중인 화면에 영향을 주지 않는다.
      }
    }

    async function start() {
      if (typeof Notification === "undefined") return;

      if (!readAsked(PERMISSION_KEY)) {
        markAsked(PERMISSION_KEY);
        if (Notification.permission === "default") {
          try {
            await Notification.requestPermission();
          } catch {
            return;
          }
        }
      }

      if (!active || Notification.permission !== "granted") return;
      timer = window.setTimeout(() => {
        void notify();
      }, REMINDER_DELAY_MS);
    }

    void start();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
