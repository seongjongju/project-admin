import type { Project } from "./store";
import { reminderKeys, reminderMessage, reminderTargets } from "./notification";

function project(id: string, startDate: string, endDate: string): Project {
  return {
    id,
    title: `프로젝트 ${id}`,
    kind: "회사",
    categoryId: "",
    category: "",
    status: "진행중",
    startDate,
    endDate,
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
const projects = [
  project("오늘시작", today, "2026-11-30"),
  project("내일끝", "2026-11-01", "2026-11-21"),
  project("둘다", today, "2026-11-21"),
  project("해당없음", "2026-11-05", "2026-11-19"),
];

test("오늘 시작과 내일 종료 프로젝트만 골라낸다", () => {
  const targets = reminderTargets(projects, today);

  expect(targets.start.map((item) => item.id)).toEqual(["오늘시작", "둘다"]);
  expect(targets.end.map((item) => item.id)).toEqual(["내일끝", "둘다"]);
});

test("해당 프로젝트가 없으면 알림 문구가 없다", () => {
  expect(reminderMessage("start", [])).toBeNull();
  expect(reminderMessage("end", [])).toBeNull();
  expect(reminderMessage("start", projects)).toContain("오늘 시작하는 프로젝트");
  expect(reminderMessage("end", projects)).toContain("내일 끝나는 프로젝트");
});

test("중복 방지 키는 날짜와 조건마다 다르다", () => {
  const keys = reminderKeys(today);

  expect(keys.start).not.toBe(keys.end);
  expect(keys.start).not.toBe(reminderKeys("2026-11-21").start);
});
