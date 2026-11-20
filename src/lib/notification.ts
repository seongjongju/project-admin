import { addDays } from "./date";
import type { Project } from "./store";

/** 앱을 연 뒤 이 시간이 지나면 알림을 확인한다. */
export const REMINDER_DELAY_MS = 10 * 60 * 1000;

const PREFIX = "project-admin:reminder";
export const PERMISSION_KEY = `${PREFIX}:permission-asked`;

/** 같은 날 같은 조건 알림은 한 번만. 조건마다 키를 둬 두 알림이 서로를 막지 않게 한다. */
export function reminderKeys(today: string) {
  return {
    start: `${PREFIX}:start:${today}`,
    end: `${PREFIX}:end:${today}`,
  };
}

export function reminderTargets(projects: Project[], today: string) {
  const tomorrow = addDays(today, 1);
  return {
    start: projects.filter((project) => project.startDate === today),
    end: projects.filter((project) => project.endDate === tomorrow),
  };
}

export function reminderMessage(
  condition: "start" | "end",
  projects: Project[],
) {
  if (projects.length === 0) return null;
  const names = projects.map((project) => project.title).join(", ");
  return condition === "start"
    ? `오늘 시작하는 프로젝트: ${names}`
    : `내일 끝나는 프로젝트: ${names}`;
}

/** 저장소가 막힌 환경(시크릿 모드 등)에서도 앱은 조용히 계속 동작한다. */
export function readAsked(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markAsked(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // 알림 중복 방지 저장 실패는 무시한다.
  }
}
