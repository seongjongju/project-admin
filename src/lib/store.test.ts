import {
  isValidProjectUrl,
  mapProjectRow,
  validateProjectInput,
  type ProjectInput,
  type ProjectRow,
} from "./store";

const input: ProjectInput = {
  title: "테스트 프로젝트",
  kind: "회사",
  categoryId: "cat-1",
  status: "진행예정",
  startDate: "2026-11-02",
  endDate: "2026-11-10",
  summary: "",
  role: "",
  url: "",
  memo: "",
  stacks: ["React"],
};

const row: ProjectRow = {
  id: "p1",
  title: "테스트 프로젝트",
  kind: "회사",
  category_id: "cat-1",
  status: "진행중",
  start_date: "2026-11-02",
  end_date: "2026-11-10",
  summary: null,
  role: null,
  url: null,
  memo: null,
  categories: { name: "쇼핑몰" },
  project_stacks: [
    { stacks: { name: "TypeScript" } },
    { stacks: { name: "React" } },
    { stacks: null },
  ],
  troubles: [
    { id: "t2", trouble: "두 번째", solution: "", position: 1 },
    { id: "t1", trouble: "첫 번째", solution: "해결", position: 0 },
  ],
  learnings: [{ id: "l1", unknown: "", learned: "배운 점", position: 0 }],
};

test("DB row를 화면용 프로젝트로 바꾼다 (종류 이름, 스택, 기록 순서)", () => {
  const project = mapProjectRow(row);

  expect(project.categoryId).toBe("cat-1");
  expect(project.category).toBe("쇼핑몰");
  expect(project.stacks).toEqual(["React", "TypeScript"]);
  expect(project.summary).toBe("");
  expect(project.troubles).toEqual([
    { id: "t1", trouble: "첫 번째", solution: "해결" },
    { id: "t2", trouble: "두 번째", solution: "" },
  ]);
  expect(project.learnings).toEqual([
    { id: "l1", unknown: "", learned: "배운 점" },
  ]);
});

test("목록 조회처럼 관계·기록이 없으면 빈 값으로 읽는다", () => {
  const project = mapProjectRow({
    ...row,
    category_id: null,
    categories: null,
    project_stacks: null,
    troubles: undefined,
    learnings: undefined,
  });

  expect(project.categoryId).toBe("");
  expect(project.category).toBe("");
  expect(project.stacks).toEqual([]);
  expect(project.troubles).toEqual([]);
  expect(project.learnings).toEqual([]);
});

test("종료일이 시작일보다 빠르면 거부한다", () => {
  expect(() =>
    validateProjectInput({ ...input, endDate: "2026-11-01" }),
  ).toThrow("종료일은 시작일보다 빠를 수 없습니다.");
});

test("이름이 비었거나 http(s)가 아닌 링크는 거부한다", () => {
  expect(() => validateProjectInput({ ...input, title: "  " })).toThrow(
    "프로젝트 이름을 입력해 주세요.",
  );
  expect(() => validateProjectInput({ ...input, url: "example.com" })).toThrow(
    "링크는",
  );
});

test("올바른 입력과 빈 링크는 통과한다", () => {
  expect(() => validateProjectInput(input)).not.toThrow();
  expect(() => validateProjectInput({ ...input, url: "" })).not.toThrow();
  expect(isValidProjectUrl("https://example.com")).toBe(true);
  expect(isValidProjectUrl("ftp://example.com")).toBe(false);
});
