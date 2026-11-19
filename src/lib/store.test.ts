import {
  addCategory,
  addStack,
  createProject,
  deleteProject,
  getProject,
  listCategories,
  listProjects,
  listStacks,
  saveProjectRecords,
  updateProject,
  type ProjectInput,
} from "./store";

const input: ProjectInput = {
  title: "테스트 프로젝트",
  kind: "회사",
  category: "관리자",
  status: "진행예정",
  startDate: "2026-11-02",
  endDate: "2026-11-10",
  summary: "",
  role: "",
  url: "",
  memo: "",
  stacks: ["React"],
};

beforeEach(() => {
  window.localStorage.clear();
});

test("처음이면 세 상태를 모두 가진 샘플 프로젝트를 만든다", async () => {
  const projects = await listProjects();
  const statuses = new Set(projects.map((project) => project.status));
  expect(statuses).toEqual(new Set(["진행예정", "진행중", "완료"]));
});

test("스택과 종류는 대소문자만 다르면 중복 저장하지 않는다", async () => {
  expect(await addStack("react")).toBe("React");
  expect((await listStacks()).filter((s) => s.toLowerCase() === "react")).toHaveLength(1);

  expect(await addCategory("관리자")).toBe("관리자");
  expect((await listCategories()).filter((c) => c === "관리자")).toHaveLength(1);
});

test("프로젝트를 만들고, 수정하고, 삭제할 수 있다", async () => {
  const created = await createProject(input);
  expect(await getProject(created.id)).toMatchObject({
    title: "테스트 프로젝트",
    status: "진행예정",
  });

  const updated = await updateProject(created.id, { status: "완료" });
  expect(updated.status).toBe("완료");
  expect((await getProject(created.id))?.status).toBe("완료");

  await deleteProject(created.id);
  expect(await getProject(created.id)).toBeNull();
});

test("종료일이 시작일보다 빠르면 거부한다", async () => {
  await expect(
    createProject({ ...input, endDate: "2026-11-01" }),
  ).rejects.toThrow("종료일은 시작일보다 빠를 수 없습니다.");
});

test("http(s)가 아닌 링크는 거부한다", async () => {
  await expect(
    createProject({ ...input, url: "example.com" }),
  ).rejects.toThrow("링크는");
});

test("개인 프로젝트는 종류를 저장하지 않는다", async () => {
  const created = await createProject({
    ...input,
    kind: "개인",
    category: "관리자",
  });
  expect(created.category).toBe("");
});

test("기록은 저장되고, 예전 text 항목과 이상한 값도 읽히고, 프로젝트 수정에도 유지된다", async () => {
  window.localStorage.setItem(
    "project-admin:v2:projects",
    JSON.stringify([
      {
        id: "legacy",
        title: "예전 프로젝트",
        kind: "회사",
        category: "",
        status: "진행중",
        startDate: "2026-11-01",
        endDate: "2026-11-02",
        summary: "",
        role: "",
        url: "",
        memo: "",
        stacks: [],
        troubles: [{ text: "예전 메모" }],
        learnings: "배열이 아님",
      },
    ]),
  );

  const legacy = await getProject("legacy");
  expect(legacy?.troubles).toEqual([
    { id: "trouble-0", trouble: "예전 메모", solution: "" },
  ]);
  expect(legacy?.learnings).toEqual([]);

  await saveProjectRecords("legacy", {
    troubles: [{ id: "t1", trouble: "문제", solution: "해결" }],
    learnings: [{ id: "l1", unknown: "", learned: "배운 점" }],
  });
  await updateProject("legacy", { title: "이름 변경" });

  const updated = await getProject("legacy");
  expect(updated?.title).toBe("이름 변경");
  expect(updated?.troubles).toEqual([
    { id: "t1", trouble: "문제", solution: "해결" },
  ]);
  expect(updated?.learnings).toEqual([
    { id: "l1", unknown: "", learned: "배운 점" },
  ]);
});
