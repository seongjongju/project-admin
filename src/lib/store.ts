import { addDays, toDateKey } from "./date";

/**
 * 이번 단계의 임시 저장소(localStorage).
 * Supabase로 옮길 때 이 파일의 함수 시그니처만 유지하고 내부 구현만 교체한다.
 */

export const PROJECT_KINDS = ["회사", "개인"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const PROJECT_STATUSES = ["진행예정", "진행중", "완료"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type TroubleItem = { id: string; trouble: string; solution: string };
export type LearningItem = { id: string; unknown: string; learned: string };

export type Project = {
  id: string;
  title: string;
  kind: ProjectKind;
  category: string;
  status: ProjectStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  summary: string;
  role: string;
  url: string;
  memo: string;
  stacks: string[];
  troubles: TroubleItem[];
  learnings: LearningItem[];
};

export type ProjectInput = Omit<Project, "id" | "troubles" | "learnings">;

type Options = {
  stacks: string[];
  categories: string[];
};

const PROJECTS_KEY = "project-admin:v2:projects";
const OPTIONS_KEY = "project-admin:v2:options";

const SAMPLE_OPTIONS: Options = {
  stacks: [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "HTML/CSS",
    "Tailwind CSS",
    "Figma",
  ],
  categories: ["관리자", "쇼핑몰", "회사홍보"],
};

function sampleProjects(): Project[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = toDateKey(now);
  const monthStart = toDateKey(new Date(year, month, 1));
  const nextMonthStart = toDateKey(new Date(year, month + 1, 1));
  const prevMonthEnd = toDateKey(new Date(year, month, 0));
  const monthEndDay = new Date(year, month + 1, 0).getDate();
  const plannedStart = toDateKey(
    new Date(year, month, Math.min(now.getDate() + 7, monthEndDay)),
  );

  const projects: Omit<Project, "troubles" | "learnings">[] = [
    {
      id: "company-admin-renewal",
      title: "사내 어드민 리뉴얼",
      kind: "회사",
      category: "관리자",
      status: "진행중",
      startDate: monthStart,
      endDate: addDays(today, 25),
      summary: "레거시 관리자 화면을 React 기반으로 다시 만드는 프로젝트",
      role: "프론트엔드",
      url: "https://example.com/admin",
      memo: "목록 화면부터 작업하고, 권한별 화면은 다음 주에 확인",
      stacks: ["React", "TypeScript", "Tailwind CSS"],
    },
    {
      id: "company-commerce-detail",
      title: "커머스 상세페이지 개편",
      kind: "회사",
      category: "쇼핑몰",
      status: "완료",
      startDate: addDays(today, -45),
      endDate: today,
      summary: "상품 상세 페이지의 반응형 마크업과 인터랙션 개선",
      role: "퍼블리싱",
      url: "https://example.com/commerce",
      memo: "모바일 옵션 선택 영역을 다시 정리했다.",
      stacks: ["HTML/CSS", "JavaScript"],
    },
    {
      id: "company-design-system",
      title: "사내 디자인 시스템 정리",
      kind: "회사",
      category: "관리자",
      status: "진행예정",
      startDate: plannedStart,
      endDate: addDays(plannedStart, 10),
      summary: "반복되는 화면 요소를 공통 컴포넌트로 묶는 작업",
      role: "퍼블리싱",
      url: "",
      memo: "다음 주에 사용할 화면 목록부터 정리",
      stacks: ["React", "TypeScript"],
    },
    {
      id: "company-brand-landing",
      title: "브랜드 랜딩 페이지",
      kind: "회사",
      category: "회사홍보",
      status: "진행예정",
      startDate: nextMonthStart,
      endDate: addDays(nextMonthStart, 20),
      summary: "신규 브랜드 소개를 위한 원페이지 사이트 퍼블리싱",
      role: "퍼블리싱",
      url: "https://example.com/brand",
      memo: "브랜드 가이드가 나오면 시작",
      stacks: ["Next.js", "Tailwind CSS"],
    },
    {
      id: "personal-portfolio",
      title: "포트폴리오 사이트",
      kind: "개인",
      category: "",
      status: "진행중",
      startDate: monthStart,
      endDate: addDays(today, 40),
      summary: "작업 기록을 정리해 보여주는 개인 포트폴리오",
      role: "기획 · 디자인 · 개발",
      url: "https://example.com/portfolio",
      memo: "프로젝트 상세 페이지와 기록 화면을 먼저 만든다.",
      stacks: ["Next.js", "TypeScript", "Tailwind CSS"],
    },
    {
      id: "personal-weather",
      title: "날씨 대시보드",
      kind: "개인",
      category: "",
      status: "완료",
      startDate: addDays(today, -30),
      endDate: today,
      summary: "OpenWeather API를 활용한 도시별 날씨 화면",
      role: "프론트엔드",
      url: "https://example.com/weather",
      memo: "",
      stacks: ["React", "JavaScript"],
    },
    {
      id: "personal-todo",
      title: "Todo 앱",
      kind: "개인",
      category: "",
      status: "완료",
      startDate: addDays(prevMonthEnd, -20),
      endDate: prevMonthEnd,
      summary: "할 일을 추가하고 완료 처리하는 첫 React 프로젝트",
      role: "프론트엔드",
      url: "",
      memo: "상태 관리의 기본기를 익혔다.",
      stacks: ["React"],
    },
    {
      id: "personal-side-project",
      title: "사이드 프로젝트 기획",
      kind: "개인",
      category: "",
      status: "진행예정",
      startDate: nextMonthStart,
      endDate: addDays(nextMonthStart, 14),
      summary: "다음 달에 시작할 개인 작업의 화면과 일정 정리",
      role: "기획",
      url: "",
      memo: "",
      stacks: ["Figma"],
    },
  ];

  return projects.map((project) => ({
    ...project,
    troubles: [],
    learnings: [],
  }));
}

function textOf(value: unknown) {
  return typeof value === "string" ? value : "";
}

/**
 * 예전 데이터 보호: 배열이 아니면 빈 목록, 값이 이상하면 빈 칸으로 읽는다.
 * `text` 한 칸만 있던 항목은 첫 칸(트러블슈팅 / 몰랐던 점)으로 옮긴다.
 */
function troublesOf(value: unknown): TroubleItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    const trouble = textOf(raw.trouble) || textOf(raw.text);
    const solution = textOf(raw.solution);
    if (!trouble.trim() && !solution.trim()) return [];
    return [{ id: textOf(raw.id) || `trouble-${index}`, trouble, solution }];
  });
}

function learningsOf(value: unknown): LearningItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    const unknown = textOf(raw.unknown) || textOf(raw.text);
    const learned = textOf(raw.learned);
    if (!unknown.trim() && !learned.trim()) return [];
    return [{ id: textOf(raw.id) || `learning-${index}`, unknown, learned }];
  });
}

function readProjects(): Project[] {
  if (typeof window === "undefined") return sampleProjects();

  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // 손상된 값은 샘플로 복구한다.
  }

  if (Array.isArray(parsed)) {
    return (parsed as Project[]).map((project) => ({
      ...project,
      troubles: troublesOf(project.troubles),
      learnings: learningsOf(project.learnings),
    }));
  }

  const initial = sampleProjects();
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(initial));
  } catch {
    // 표시는 되게 두고, 저장 실패는 변경 시점에 안내한다.
  }
  return initial;
}

function writeProjects(projects: Project[]) {
  write(PROJECTS_KEY, projects);
}

function readOptions(): Options {
  if (typeof window === "undefined") return SAMPLE_OPTIONS;

  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(OPTIONS_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // 손상된 값은 샘플로 복구한다.
  }

  const value = parsed as Partial<Options> | null;
  if (Array.isArray(value?.stacks) && Array.isArray(value?.categories)) {
    return value as Options;
  }

  try {
    window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(SAMPLE_OPTIONS));
  } catch {
    // 표시는 되게 두고, 저장 실패는 변경 시점에 안내한다.
  }
  return SAMPLE_OPTIONS;
}

function writeOptions(options: Options) {
  write(OPTIONS_KEY, options);
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "브라우저에 저장하지 못했습니다. 저장 공간이 가득 찼는지 확인해 주세요.",
    );
  }
}

export function isValidProjectUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(input: ProjectInput) {
  if (!input.title.trim()) throw new Error("프로젝트 이름을 입력해 주세요.");
  if (!PROJECT_KINDS.includes(input.kind)) {
    throw new Error("프로젝트 유형을 선택해 주세요.");
  }
  if (!PROJECT_STATUSES.includes(input.status)) {
    throw new Error("프로젝트 상태를 선택해 주세요.");
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(input.startDate) || !datePattern.test(input.endDate)) {
    throw new Error("시작일과 종료일을 날짜 형식으로 입력해 주세요.");
  }
  if (input.endDate < input.startDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }
  if (!isValidProjectUrl(input.url)) {
    throw new Error(
      "링크는 http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요.",
    );
  }
}

async function addOption(
  field: "stacks" | "categories",
  name: string,
  blankMessage: string,
) {
  const value = name.trim();
  if (!value) throw new Error(blankMessage);

  const options = readOptions();
  const existing = options[field].find(
    (item) => item.toLowerCase() === value.toLowerCase(),
  );
  if (existing) return existing;

  writeOptions({ ...options, [field]: [...options[field], value] });
  return value;
}

async function normalize(input: ProjectInput): Promise<ProjectInput> {
  let category = input.kind === "회사" ? input.category.trim() : "";
  if (category) category = await addOption("categories", category, "");

  const stacks: string[] = [];
  for (const raw of input.stacks) {
    if (!raw.trim()) continue;
    const canonical = await addOption("stacks", raw, "");
    if (!stacks.some((item) => item.toLowerCase() === canonical.toLowerCase())) {
      stacks.push(canonical);
    }
  }

  return {
    title: input.title.trim(),
    kind: input.kind,
    category,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    summary: input.summary.trim(),
    role: input.role.trim(),
    url: input.url.trim(),
    memo: input.memo.trim(),
    stacks,
  };
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listStacks(): Promise<string[]> {
  return [...readOptions().stacks];
}

export async function addStack(name: string): Promise<string> {
  return addOption("stacks", name, "스택 이름을 입력해 주세요.");
}

export async function listCategories(): Promise<string[]> {
  return [...readOptions().categories];
}

export async function addCategory(name: string): Promise<string> {
  return addOption("categories", name, "종류 이름을 입력해 주세요.");
}

export async function listProjects(): Promise<Project[]> {
  return [...readProjects()].sort(
    (a, b) =>
      b.startDate.localeCompare(a.startDate) ||
      a.title.localeCompare(b.title),
  );
}

export async function getProject(id: string): Promise<Project | null> {
  return readProjects().find((project) => project.id === id) ?? null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  validate(input);
  const normalized = await normalize(input);
  const project: Project = {
    id: newId(),
    ...normalized,
    troubles: [],
    learnings: [],
  };
  writeProjects([...readProjects(), project]);
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInput>,
): Promise<Project> {
  const projects = readProjects();
  const current = projects.find((project) => project.id === id);
  if (!current) {
    throw new Error("프로젝트를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  }

  const merged: ProjectInput = {
    title: patch.title ?? current.title,
    kind: patch.kind ?? current.kind,
    category: patch.category ?? current.category,
    status: patch.status ?? current.status,
    startDate: patch.startDate ?? current.startDate,
    endDate: patch.endDate ?? current.endDate,
    summary: patch.summary ?? current.summary,
    role: patch.role ?? current.role,
    url: patch.url ?? current.url,
    memo: patch.memo ?? current.memo,
    stacks: patch.stacks ?? current.stacks,
  };
  validate(merged);
  const normalized = await normalize(merged);
  const next: Project = {
    id,
    ...normalized,
    troubles: current.troubles,
    learnings: current.learnings,
  };
  writeProjects(
    projects.map((project) => (project.id === id ? next : project)),
  );
  return next;
}

export async function saveProjectRecords(
  id: string,
  records: Partial<Pick<Project, "troubles" | "learnings">>,
): Promise<Project> {
  const projects = readProjects();
  const current = projects.find((project) => project.id === id);
  if (!current) {
    throw new Error("프로젝트를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  }

  const next: Project = {
    ...current,
    troubles: troublesOf(records.troubles ?? current.troubles),
    learnings: learningsOf(records.learnings ?? current.learnings),
  };
  writeProjects(
    projects.map((project) => (project.id === id ? next : project)),
  );
  return next;
}

export async function deleteProject(id: string): Promise<void> {
  writeProjects(readProjects().filter((project) => project.id !== id));
}
