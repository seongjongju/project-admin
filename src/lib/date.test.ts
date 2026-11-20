import { formatRangeCompact } from "./date";

test("목록용 기간은 같은 해에 연도를 생략하고 다른 해에는 연도를 표시한다", () => {
  expect(formatRangeCompact("2026-11-20", "2026-11-22")).toBe("11.20 ~ 11.22");
  expect(formatRangeCompact("2026-12-31", "2027-01-02")).toBe(
    "2026.12.31 ~ 2027.01.02",
  );
});
