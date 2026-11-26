import {
  flatScheduleItems,
  isValidProjectUrl,
  mapProjectRow,
  validateProjectInput,
  validateScheduleInput,
  withDownloadName,
  type ProjectInput,
  type ProjectRow,
} from "./store";

const input: ProjectInput = {
  title: "테스트 프로젝트",
  kind: "회사",
  categoryId: "cat-1",
  status: "진행예정",
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
  project_schedules: [
    {
      id: "s2",
      title: "두 번째 일정",
      start_date: "2026-11-10",
      end_date: "2026-11-12",
      status: "완료",
    },
    {
      id: "s1",
      title: "첫 번째 일정",
      start_date: "2026-11-02",
      end_date: "2026-11-08",
      status: "진행중",
    },
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

test("프로젝트 기간은 일정의 최소 시작일·최대 끝날짜에서 계산한다", () => {
  const project = mapProjectRow(row);

  expect(project.schedules.map((item) => item.id)).toEqual(["s1", "s2"]);
  expect(project.schedules[0]).toEqual({
    id: "s1",
    projectId: "p1",
    title: "첫 번째 일정",
    startDate: "2026-11-02",
    endDate: "2026-11-08",
    status: "진행중",
  });
  expect(project.startDate).toBe("2026-11-02");
  expect(project.endDate).toBe("2026-11-12");
});

test("일정이 없으면 기간은 비어 있고 달력에도 일정이 없다", () => {
  const project = mapProjectRow({
    ...row,
    project_schedules: null,
  });

  expect(project.schedules).toEqual([]);
  expect(project.startDate).toBe("");
  expect(project.endDate).toBe("");
  expect(flatScheduleItems([project])).toEqual([]);
});

test("달력은 일정 단위로 펼치고 프로젝트 이름을 붙인다", () => {
  expect(flatScheduleItems([mapProjectRow(row)])).toEqual([
    {
      id: "s1",
      projectId: "p1",
      projectTitle: "테스트 프로젝트",
      title: "첫 번째 일정",
      startDate: "2026-11-02",
      endDate: "2026-11-08",
      status: "진행중",
    },
    {
      id: "s2",
      projectId: "p1",
      projectTitle: "테스트 프로젝트",
      title: "두 번째 일정",
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      status: "완료",
    },
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

test("일정은 제목·날짜 형식·순서·상태를 검사한다", () => {
  const schedule = {
    title: "메인페이지 작업",
    startDate: "2026-11-02",
    endDate: "2026-11-10",
    status: "진행예정" as const,
  };

  expect(() => validateScheduleInput(schedule)).not.toThrow();
  expect(() => validateScheduleInput({ ...schedule, title: " " })).toThrow(
    "일정 제목을 입력해 주세요.",
  );
  expect(() =>
    validateScheduleInput({ ...schedule, endDate: "2026-11-01" }),
  ).toThrow("끝날짜는 시작날짜보다 빠를 수 없습니다.");
  expect(() =>
    validateScheduleInput({ ...schedule, startDate: "11-02" }),
  ).toThrow("날짜 형식");
  expect(() =>
    validateScheduleInput({ ...schedule, status: "모름" as never }),
  ).toThrow("일정 상태를 선택해 주세요.");
});

test("서명 URL에 원본 파일명을 다운로드 이름으로 붙인다", () => {
  const url = "https://example.supabase.co/object/sign/file?token=abc";

  expect(withDownloadName(url, "한글 문서.docx")).toBe(
    `${url}&download=${encodeURIComponent("한글 문서.docx")}`,
  );
  expect(withDownloadName("https://example.com/file", "report.pdf")).toBe(
    `https://example.com/file?download=report.pdf`,
  );
  expect(withDownloadName("", "report.pdf")).toBe("");
});
