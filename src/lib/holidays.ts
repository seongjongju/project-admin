import { getHolidays, SUPPORTED_YEARS } from "korea-holidays";

export type Holiday = { date: string; name: string };

// 임시공휴일·선거일처럼 규칙으로 계산할 수 없는 날짜만 여기에 적는다.
// 같은 날짜가 라이브러리에 있어도 이 목록이 우선한다(이름을 직접 고치고 싶을 때).
export const EXTRA_HOLIDAYS: Holiday[] = [
  { date: "2026-06-03", name: "지방선거일" },
];

const cache = new Map<number, Map<string, string>>();

// shortcut: korea-holidays는 2024~2027만 지원한다. 범위 밖 연도는 수동 목록만 쓴다.
// 라이브러리가 연도를 추가하면 자동으로 따라간다.
function holidaysOf(year: number) {
  let byDate = cache.get(year);
  if (!byDate) {
    byDate = new Map(
      (SUPPORTED_YEARS.includes(year) ? getHolidays(year) : []).map(
        (holiday) => [holiday.date, holiday.name],
      ),
    );
    for (const holiday of EXTRA_HOLIDAYS) {
      if (holiday.date.startsWith(`${year}-`)) byDate.set(holiday.date, holiday.name);
    }
    cache.set(year, byDate);
  }
  return byDate;
}

export function getHolidayName(dateKey: string) {
  return holidaysOf(Number(dateKey.slice(0, 4))).get(dateKey);
}
