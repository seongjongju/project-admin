const DAY_MS = 86_400_000;

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

export function formatDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

export function formatRange(start: string, end: string) {
  return start === end ? formatDate(start) : `${formatDate(start)} ~ ${formatDate(end)}`;
}

/** 목록용 짧은 기간. 같은 해는 연도를 생략해 320px에서도 잘리지 않게 한다. */
export function formatRangeCompact(start: string, end: string) {
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return `${start.replace(/-/g, ".")} ~ ${end.replace(/-/g, ".")}`;
  }
  return `${start.slice(5).replace("-", ".")} ~ ${end.slice(5).replace("-", ".")}`;
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
