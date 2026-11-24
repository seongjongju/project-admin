jest.mock("./supabase/config", () => ({
  hasSupabaseConfig: () => true,
  CONFIG_ERROR: "",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_KEY: "public-key",
}));

jest.mock("./supabase/client", () => {
  const state = {
    calls: [] as unknown[][],
    result: { data: [] as unknown[], count: 0, error: null },
  };
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "ilike",
    "in",
    "gte",
    "lte",
    "order",
    "range",
  ]) {
    chain[method] = (...args: unknown[]) => {
      state.calls.push([method, ...args]);
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(state.result).then(resolve);
  return { createClient: () => ({ from: () => chain }), state };
});

import {
  createdAtBounds,
  ilikePattern,
  listQueryString,
  PAGE_SIZE,
  pageWindow,
  parseStatuses,
  queryProjects,
  readListFilter,
  totalPageCount,
} from "./store";

const mockState = jest.requireMock("./supabase/client").state as {
  calls: unknown[][];
  result: { data: unknown[]; count: number; error: null };
};

beforeEach(() => {
  mockState.calls.length = 0;
  mockState.result.data = [];
  mockState.result.count = 0;
});

test("주소 쿼리를 필터로 읽고 다시 쿼리 문자열로 만든다", () => {
  const filter = readListFilter(
    new URLSearchParams("q=%20리액트%20&status=진행중&status=완료&status=나쁨&from=2026-11-01&to=2026-11-24&page=3"),
  );

  expect(filter).toEqual({
    q: " 리액트 ",
    statuses: ["진행중", "완료"],
    from: "2026-11-01",
    to: "2026-11-24",
    page: 3,
  });
  expect(
    listQueryString({ ...filter, q: filter.q.trim(), page: 1 }),
  ).toBe(
    "q=%EB%A6%AC%EC%95%A1%ED%8A%B8&status=%EC%A7%84%ED%96%89%EC%A4%91&status=%EC%99%84%EB%A3%8C&from=2026-11-01&to=2026-11-24",
  );
  expect(parseStatuses(["완료", "완료"])).toEqual(["완료"]);
  expect(readListFilter(new URLSearchParams("page=0")).page).toBe(1);
  expect(readListFilter(new URLSearchParams("page=xyz")).page).toBe(1);
});

test("ilike 특수문자와 한국 시간 등록일 범위를 바꾼다", () => {
  expect(ilikePattern("A%B_C\\D")).toBe("%A\\%B\\_C\\\\D%");
  expect(createdAtBounds("2026-11-20", "2026-11-24")).toEqual({
    from: "2026-11-20T00:00:00+09:00",
    to: "2026-11-24T23:59:59+09:00",
  });
  expect(createdAtBounds("", "2026-1-2")).toEqual({ from: "", to: "" });
});

test("페이지 번호는 현재 주변과 처음·끝만 보여준다", () => {
  expect(totalPageCount(10)).toBe(1);
  expect(totalPageCount(11)).toBe(2);
  expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  expect(pageWindow(5, 20)).toEqual([1, "…", 4, 5, 6, "…", 20]);
  expect(pageWindow(20, 20)).toEqual([1, "…", 19, 20]);
});

test("필터와 페이지를 Supabase 조회 쿼리에 넘기고 목록·전체 개수를 함께 받는다", async () => {
  mockState.result.count = 23;
  mockState.result.data = [
    {
      id: "p1",
      title: "이름",
      kind: "회사",
      category_id: null,
      status: "진행중",
      start_date: null,
      end_date: null,
      summary: null,
      role: null,
      url: null,
      memo: null,
      categories: null,
      project_stacks: [],
      project_schedules: [],
    },
  ];

  const result = await queryProjects({
    kind: "회사",
    q: "A%B",
    statuses: ["진행중"],
    from: "2026-11-20",
    to: "2026-11-24",
    page: 2,
  });

  expect(result.total).toBe(23);
  expect(result.projects[0].title).toBe("이름");
  expect(mockState.calls).toEqual([
    ["select", expect.stringContaining("project_schedules"), { count: "exact" }],
    ["eq", "kind", "회사"],
    ["ilike", "title", "%A\\%B%"],
    ["in", "status", ["진행중"]],
    ["gte", "created_at", "2026-11-20T00:00:00+09:00"],
    ["lte", "created_at", "2026-11-24T23:59:59+09:00"],
    ["order", "created_at", { ascending: true }],
    ["range", PAGE_SIZE, PAGE_SIZE * 2 - 1],
  ]);
});

test("비어 있는 조건은 쿼리에 넣지 않는다", async () => {
  await queryProjects({
    kind: "개인",
    q: "  ",
    statuses: [],
    from: "",
    to: "",
    page: 1,
  });

  expect(mockState.calls.some(([method]) => method === "ilike")).toBe(false);
  expect(mockState.calls.some(([method]) => method === "in")).toBe(false);
  expect(mockState.calls.some(([method]) => method === "gte")).toBe(false);
  expect(mockState.calls.some(([method]) => method === "lte")).toBe(false);
});
