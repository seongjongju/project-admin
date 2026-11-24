const DAY_MS = 86_400_000;
const SEOUL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date -> 한국 시간 기준 "YYYY-MM-DD". 브라우저 시간대와 무관하게 하루를 판단한다. */
export function toSeoulDateKey(date: Date) {
  const parts = SEOUL_DATE.formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Date -> "YYYY-MM-DD" (browser local time) */
export function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "YYYY-MM-DD" -> UTC timestamp, so day math is DST-safe */
function utc(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(key: string, days: number) {
  return new Date(utc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string) {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

/** 날짜의 월만 앞뒤로 이동한다. 말일은 대상 월의 마지막 날로 보정한다. */
export function shiftMonth(key: string, delta: number) {
  const [year, month, day] = key.split("-").map(Number);
  const first = new Date(year, month - 1 + delta, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toDateKey(
    new Date(first.getFullYear(), first.getMonth(), Math.min(day, lastDay)),
  );
}

export function formatDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

export function formatRange(start: string, end: string) {
  if (!start || !end) return "일정 없음";
  return start === end ? formatDate(start) : `${formatDate(start)} ~ ${formatDate(end)}`;
}

/** 목록용 짧은 기간. 같은 해는 연도를 생략해 320px에서도 잘리지 않게 한다. */
export function formatRangeCompact(start: string, end: string) {
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return `${start.replace(/-/g, ".")} ~ ${end.replace(/-/g, ".")}`;
  }
  return `${start.slice(5).replace("-", ".")} ~ ${end.slice(5).replace("-", ".")}`;
}

/** "YYYY-MM-DD" -> 요일(0=일요일). UTC 기준이라 시간대 영향이 없다. */
export function weekdayOf(key: string) {
  return new Date(utc(key)).getUTCDay();
}

/** 기간을 보이는 구간에 자른다. 겹치지 않으면 null. */
export function overlapRange(
  start: string,
  end: string,
  from: string,
  to: string,
) {
  const first = start > from ? start : from;
  const last = end < to ? end : to;
  return first <= last ? ([first, last] as const) : null;
}

/** 날짜 칸 클릭으로 시작일/끝일을 바꿀 때 항상 start <= end 를 유지한다. */
export function applyDateTarget(
  target: "start" | "end",
  day: string,
  start: string,
  end: string,
): [string, string] {
  if (target === "start") {
    return day <= end ? [day, end] : [end, day];
  }
  return day >= start ? [start, day] : [day, start];
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export type CalendarDay = { key: string; day: number; inMonth: boolean };
export type CalendarWeek = { days: CalendarDay[] };

/** Sunday-start month grid, including the days around the month. */
export function getMonthWeeks(year: number, month: number): CalendarWeek[] {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const start = new Date(year, month, 1 - offset);
  const weeks: CalendarWeek[] = [];

  for (let i = 0; i < cellCount; i += 7) {
    const days: CalendarDay[] = [];
    for (let j = 0; j < 7; j++) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i + j,
      );
      days.push({
        key: toDateKey(date),
        day: date.getDate(),
        inMonth: date.getMonth() === month,
      });
    }
    weeks.push({ days });
  }

  return weeks;
}
