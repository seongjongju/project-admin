import {
  applyDateTarget,
  formatRangeCompact,
  overlapRange,
  shiftMonth,
  toSeoulDateKey,
  weekdayOf,
} from "./date";

test("목록용 기간은 같은 해에 연도를 생략하고 다른 해에는 연도를 표시한다", () => {
  expect(formatRangeCompact("2026-11-20", "2026-11-22")).toBe("11.20 ~ 11.22");
  expect(formatRangeCompact("2026-12-31", "2027-01-02")).toBe(
    "2026.12.31 ~ 2027.01.02",
  );
});

test("한국 시간 기준 날짜는 UTC 날짜와 다를 수 있다", () => {
  expect(toSeoulDateKey(new Date("2026-11-20T15:30:00Z"))).toBe("2026-11-21");
  expect(toSeoulDateKey(new Date("2026-11-20T14:59:00Z"))).toBe("2026-11-20");
});

test("요일은 시간대와 무관하게 UTC 기준으로 계산된다", () => {
  expect(weekdayOf("2026-11-22")).toBe(0); // 일요일
  expect(weekdayOf("2026-11-28")).toBe(6); // 토요일
});

test("기간을 보이는 구간에 자르고 겹치지 않으면 null이다", () => {
  expect(overlapRange("2026-11-18", "2026-11-25", "2026-11-20", "2026-11-30")).toEqual([
    "2026-11-20",
    "2026-11-25",
  ]);
  expect(overlapRange("2026-12-01", "2026-12-05", "2026-11-20", "2026-11-30")).toBeNull();
});

test("월 이동은 말일을 다음 달의 마지막 날로 보정한다", () => {
  expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-28");
  expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-15");
  expect(shiftMonth("2026-03-15", -1)).toBe("2026-02-15");
});

test("날짜 클릭으로 시작일/끝일을 바꿔도 기간 순서가 유지된다", () => {
  expect(applyDateTarget("start", "2026-11-18", "2026-11-20", "2026-11-25")).toEqual([
    "2026-11-18",
    "2026-11-25",
  ]);
  expect(applyDateTarget("start", "2026-11-28", "2026-11-20", "2026-11-25")).toEqual([
    "2026-11-25",
    "2026-11-28",
  ]);
  expect(applyDateTarget("end", "2026-11-22", "2026-11-20", "2026-11-25")).toEqual([
    "2026-11-20",
    "2026-11-22",
  ]);
  expect(applyDateTarget("end", "2026-11-10", "2026-11-20", "2026-11-25")).toEqual([
    "2026-11-10",
    "2026-11-20",
  ]);
});
