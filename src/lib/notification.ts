import { addDays } from "./date";
import type { Project } from "./store";

/** 앱을 연 뒤 이 시간이 지나면 알림을 확인한다. */
export const REMINDER_DELAY_MS = 10 * 60 * 1000;
export const NOTIFICATION_TITLE = "프로젝트 일정 알림";

const PREFIX = "project-admin:reminder";

/** 날짜 + 알림 종류(그날의 묶음 알림)를 함께 기록한다. */
export function reminderKey(today: string) {
  return `${PREFIX}:daily:${today}`;
}

/** 같은 프로젝트의 대상 일정을 프로젝트명 아래에 묶는다. */
export type ReminderGroup = {
  projectTitle: string;
  scheduleTitles: string[];
};

export type ReminderTargets = {
  start: ReminderGroup[];
  end: ReminderGroup[];
};

function addGroup(
  groups: Map<string, ReminderGroup>,
  project: Project,
  scheduleTitle: string,
) {
  const group = groups.get(project.id);
  if (group) group.scheduleTitles.push(scheduleTitle);
  else groups.set(project.id, { projectTitle: project.title, scheduleTitles: [scheduleTitle] });
}

/** 완료 일정·완료 프로젝트를 제외하고 오늘 시작 / 내일 종료 일정을 모은다. */
export function reminderTargets(
  projects: Project[],
  today: string,
): ReminderTargets {
  const tomorrow = addDays(today, 1);
  const start = new Map<string, ReminderGroup>();
  const end = new Map<string, ReminderGroup>();

  for (const project of projects) {
    if (project.status === "완료") continue;
    for (const schedule of project.schedules) {
      if (schedule.status === "완료") continue;
      if (schedule.startDate === today) addGroup(start, project, schedule.title);
      if (schedule.endDate === tomorrow) addGroup(end, project, schedule.title);
    }
  }

  return { start: [...start.values()], end: [...end.values()] };
}

/** 대상이 없으면 null. 두 조건을 한 문장으로 합친다. */
export function reminderMessage(targets: ReminderTargets) {
  const format = (group: ReminderGroup) =>
    `${group.projectTitle} - ${group.scheduleTitles.join(", ")}`;
  const parts: string[] = [];
  if (targets.start.length > 0) {
    parts.push(`오늘 시작: ${targets.start.map(format).join("; ")}`);
  }
  if (targets.end.length > 0) {
    parts.push(`내일 종료: ${targets.end.map(format).join("; ")}`);
  }
  return parts.length > 0 ? parts.join(" / ") : null;
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
