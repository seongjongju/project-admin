import {
  NOTIFICATION_TITLE,
  reminderKey,
  reminderMessage,
  reminderTargets,
} from "./notification";
import type { Project, ProjectSchedule, ProjectStatus } from "./store";

function schedule(
  id: string,
  startDate: string,
  endDate: string,
  title: string,
  status: ProjectStatus = "진행중",
): ProjectSchedule {
  return { id, projectId: id, title, startDate, endDate, status };
}

function project(
  id: string,
  schedules: ProjectSchedule[] = [],
  status: ProjectStatus = "진행중",
): Project {
  return {
    id,
    title: id,
    kind: "회사",
    categoryId: "",
    category: "",
    status,
    startDate: "2000-01-01", // 알림이 파생 기간을 쓰지 않는지 확인하는 값
    endDate: "2000-01-01",
    schedules,
    summary: "",
    role: "",
    url: "",
    memo: "",
    stacks: [],
    troubles: [],
    learnings: [],
  };
}

const today = "2026-11-20";
const tomorrow = "2026-11-21";
const projects = [
  project("A", [
    schedule("a1", today, "2026-11-30", "퍼블리싱"),
    schedule("a2", today, "2026-11-25", "애니메이션"),
    schedule("a3", "2026-11-01", tomorrow, "디자인"),
  ]),
  project("B", [schedule("b1", "2026-11-10", tomorrow, "마무리")]),
  project("완료일정", [schedule("d1", today, tomorrow, "완료된 일정", "완료")]),
  project("완료프로젝트", [schedule("p1", today, tomorrow, "제외")], "완료"),
  project("일정없음", []),
  project("파생기간함정", [
    schedule("o1", "2026-11-01", "2026-11-05", "예전 일정"),
    schedule("o2", today, "2026-11-25", "오늘 시작 일정"),
  ]),
];

test("완료 일정·완료 프로젝트·일정 없는 프로젝트를 제외하고 일정 날짜로 고른다", () => {
  const targets = reminderTargets(projects, today);

  expect(targets.start).toEqual([
    { projectTitle: "A", scheduleTitles: ["퍼블리싱", "애니메이션"] },
    { projectTitle: "파생기간함정", scheduleTitles: ["오늘 시작 일정"] },
  ]);
  expect(targets.end).toEqual([
    { projectTitle: "A", scheduleTitles: ["디자인"] },
    { projectTitle: "B", scheduleTitles: ["마무리"] },
  ]);
});

test("문구에 프로젝트명과 일정 제목을 함께 쓰고 같은 프로젝트 일정은 묶는다", () => {
  expect(reminderMessage(reminderTargets(projects, today))).toBe(
    "오늘 시작: A - 퍼블리싱, 애니메이션; 파생기간함정 - 오늘 시작 일정 / 내일 종료: A - 디자인; B - 마무리",
  );
});

test("대상이 없으면 문구가 없고 조건 하나만 해당하면 그 부분만 쓴다", () => {
  expect(reminderMessage(reminderTargets([], today))).toBeNull();
  expect(
    reminderMessage(reminderTargets([projects[4], projects[3]], today)),
  ).toBeNull();
  expect(
    reminderMessage(
      reminderTargets(
        [project("오늘만", [schedule("s", today, today, "착수")])],
        today,
      ),
    ),
  ).toBe("오늘 시작: 오늘만 - 착수");
});

test("알림 제목과 중복 방지 키는 날짜마다 다르다", () => {
  expect(NOTIFICATION_TITLE).toBe("프로젝트 일정 알림");
  expect(reminderKey(today)).not.toBe(reminderKey(tomorrow));
  expect(reminderKey(today)).toContain(today);
});
