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
  parseStatus,
  queryProjects,
  readListFilter,
  totalPageCount,
} from "./store";

const mockState = jest.requireMock("./supabase/client").state as {
  calls: unknown[][];
  result: { data: unknown[]; count: number; error: null };
};

const row = {
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
};

beforeEach(() => {
  mockState.calls.length = 0;
  mockState.result.data = [];
  mockState.result.count = 0;
});

test("주소 쿼리의 status는 하나만 읽고 알 수 없는 값은 전체로 처리한다", () => {
  const filter = readListFilter(
    new URLSearchParams(
      "q=%20리액트%20&status=진행중&status=완료&from=2026-11-01&to=2026-11-24&page=3",
    ),
  );

  expect(filter).toEqual({
    q: " 리액트 ",
    status: "진행중",
    from: "2026-11-01",
    to: "2026-11-24",
    page: 3,
  });
  expect(
    listQueryString({ ...filter, q: filter.q.trim(), page: 1 }),
  ).toBe(
    "q=%EB%A6%AC%EC%95%A1%ED%8A%B8&status=%EC%A7%84%ED%96%89%EC%A4%91&from=2026-11-01&to=2026-11-24",
  );
  expect(parseStatus("완료")).toBe("완료");
  expect(parseStatus("나쁨")).toBe("");
  expect(parseStatus(null)).toBe("");
  expect(readListFilter(new URLSearchParams("status=나쁨")).status).toBe("");
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

test("상태를 하나 고르면 해당 상태만 등록순으로 조회한다", async () => {
  mockState.result.count = 23;
  mockState.result.data = [row];

  const result = await queryProjects({
    kind: "회사",
    q: "A%B",
    status: "진행중",
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
    ["eq", "status", "진행중"],
    ["gte", "created_at", "2026-11-20T00:00:00+09:00"],
    ["lte", "created_at", "2026-11-24T23:59:59+09:00"],
    ["order", "created_at", { ascending: false }],
    ["range", PAGE_SIZE, PAGE_SIZE * 2 - 1],
  ]);
});

test("전체 선택은 상태순(status_rank)을 먼저, 그다음 등록 최신순으로 정렬한다", async () => {
  mockState.result.data = [row];

  await queryProjects({ kind: "회사", q: "", status: "", from: "", to: "", page: 1 });

  expect(mockState.calls.some(([method, column]) => method === "eq" && column === "status")).toBe(false);
  expect(mockState.calls.filter(([method]) => method === "order")).toEqual([
    ["order", "status_rank", { ascending: true }],
    ["order", "created_at", { ascending: false }],
  ]);
});

test("비어 있는 조건은 쿼리에 넣지 않는다", async () => {
  await queryProjects({
    kind: "개인",
    q: "  ",
    status: "",
    from: "",
    to: "",
    page: 1,
  });

  expect(mockState.calls.some(([method]) => method === "ilike")).toBe(false);
  expect(
    mockState.calls.filter(
      ([method, column]) => method === "eq" && column === "status",
    ),
  ).toHaveLength(0);
  expect(mockState.calls.some(([method]) => method === "gte")).toBe(false);
  expect(mockState.calls.some(([method]) => method === "lte")).toBe(false);
});
