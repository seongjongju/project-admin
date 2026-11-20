import { CONFIG_ERROR, hasSupabaseConfig } from "./supabase/config";
import { createClient } from "./supabase/client";

/**
 * 데이터 접근 계층. 화면은 이 파일의 함수만 쓰고, 여기서 Supabase를 호출한다.
 * 테이블 구조는 `supabase/schema.sql` 참고.
 */

export const PROJECT_KINDS = ["회사", "개인"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const PROJECT_STATUSES = ["진행예정", "진행중", "완료"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type TroubleItem = { id: string; trouble: string; solution: string };
export type LearningItem = { id: string; unknown: string; learned: string };

/** 스택/종류 선택지. 종류는 id로 주고받고 화면에는 name을 보여준다. */
export type Option = { id: string; name: string };

export type Project = {
  id: string;
  title: string;
  kind: ProjectKind;
  categoryId: string; // "" = 종류 없음
  category: string; // 화면 표시용 종류 이름 (읽기 전용)
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

export type ProjectInput = Omit<
  Project,
  "id" | "category" | "troubles" | "learnings"
>;

/** PostgREST는 관계를 객체 또는 배열로 돌려준다. 둘 다 받아 준다. */
type Relation<T> = T | T[] | null | undefined;

export type ProjectRow = {
  id: string;
  title: string;
  kind: string;
  category_id: string | null;
  status: string;
  start_date: string;
  end_date: string;
  summary: string | null;
  role: string | null;
  url: string | null;
  memo: string | null;
  categories: Relation<{ name: string }>;
  project_stacks: Relation<{ stacks: Relation<{ name: string }> }>;
  troubles?: { id: string; trouble: string; solution: string; position: number }[] | null;
  learnings?: { id: string; unknown: string; learned: string; position: number }[] | null;
};

const PROJECT_FIELDS =
  "id, title, kind, category_id, status, start_date, end_date, summary, role, url, memo, categories ( name ), project_stacks ( stacks ( name ) )";

const NOT_FOUND =
  "프로젝트를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.";

function client() {
  if (!hasSupabaseConfig()) throw new Error(CONFIG_ERROR);
  return createClient();
}

type DbError = { message?: string; code?: string; status?: number };

/**
 * DB 오류를 화면 문구로 바꾼다. 세션이 만료됐으면 로그인 화면으로 보낸다.
 * (Supabase가 401을 주면 쿠키 세션이 더 이상 유효하지 않다는 뜻이다.)
 */
function fail(error: DbError, fallback: string): never {
  const message = error?.message ?? "";

  if (
    error?.status === 401 ||
    error?.code === "PGRST301" ||
    /jwt|not authenticated/i.test(message)
  ) {
    if (typeof window !== "undefined") window.location.replace("/login");
    throw new Error("세션이 만료되었어요. 다시 로그인해 주세요.");
  }

  const known: [string, string][] = [
    ["PROJECT_NOT_FOUND", NOT_FOUND],
    [
      "CATEGORY_NOT_FOUND",
      "선택한 종류를 찾지 못했습니다. 종류 목록을 다시 불러온 뒤 선택해 주세요.",
    ],
    ["TITLE_REQUIRED", "프로젝트 이름을 입력해 주세요."],
    ["OPTION_NAME_REQUIRED", "이름을 입력해 주세요."],
  ];
  for (const [code, text] of known) {
    if (message.includes(code)) throw new Error(text);
  }
  throw new Error(fallback);
}

function byPosition<T extends { position: number }>(items: T[] | null | undefined) {
  return [...(items ?? [])].sort((a, b) => a.position - b.position);
}

function one<T>(value: Relation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function many<T>(value: Relation<T>): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** DB row → 화면에서 쓰는 Project */
export function mapProjectRow(row: ProjectRow): Project {
  const stacks = many(row.project_stacks)
    .flatMap((link) => {
      const stack = one(link.stacks);
      return stack?.name ? [stack.name] : [];
    })
    .sort((a, b) => a.localeCompare(b));

  return {
    id: row.id,
    title: row.title,
    kind: row.kind as ProjectKind,
    categoryId: row.category_id ?? "",
    category: one(row.categories)?.name ?? "",
    status: row.status as ProjectStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    summary: row.summary ?? "",
    role: row.role ?? "",
    url: row.url ?? "",
    memo: row.memo ?? "",
    stacks,
    troubles: byPosition(row.troubles).map(({ id, trouble, solution }) => ({
      id,
      trouble,
      solution,
    })),
    learnings: byPosition(row.learnings).map(({ id, unknown, learned }) => ({
      id,
      unknown,
      learned,
    })),
  };
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

export function validateProjectInput(input: ProjectInput) {
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

/** 기록 UI의 임시 key 용. DB id는 저장할 때 서버가 만든다. */
export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listStacks(): Promise<string[]> {
  const { data, error } = await client()
    .from("stacks")
    .select("name")
    .order("name");

  if (error) {
    fail(error, "스택 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return (data ?? []).map((row: { name: string }) => row.name);
}

export async function addStack(name: string): Promise<string> {
  const value = name.trim();
  if (!value) throw new Error("스택 이름을 입력해 주세요.");

  const { data, error } = await client().rpc("add_option", {
    p_kind: "stack",
    p_name: value,
  });

  if (error) {
    fail(error, "스택을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const row = (data as Option[] | null)?.[0];
  if (!row) throw new Error("스택을 저장하지 못했습니다. 다시 시도해 주세요.");
  return row.name;
}

export async function listCategories(): Promise<Option[]> {
  const { data, error } = await client()
    .from("categories")
    .select("id, name")
    .order("name");

  if (error) {
    fail(error, "종류 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return (data ?? []) as Option[];
}

export async function addCategory(name: string): Promise<Option> {
  const value = name.trim();
  if (!value) throw new Error("종류 이름을 입력해 주세요.");

  const { data, error } = await client().rpc("add_option", {
    p_kind: "category",
    p_name: value,
  });

  if (error) {
    fail(error, "종류를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const row = (data as Option[] | null)?.[0];
  if (!row) throw new Error("종류를 저장하지 못했습니다. 다시 시도해 주세요.");
  return row;
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await client()
    .from("projects")
    .select(PROJECT_FIELDS)
    .order("start_date", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    fail(error, "프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return ((data ?? []) as unknown as ProjectRow[]).map(mapProjectRow);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await client()
    .from("projects")
    .select(
      `${PROJECT_FIELDS}, troubles ( id, trouble, solution, position ), learnings ( id, unknown, learned, position )`,
    )
    .eq("id", id)
    .limit(1);

  if (error) {
    fail(error, "프로젝트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const row = ((data ?? []) as unknown as ProjectRow[])[0];
  return row ? mapProjectRow(row) : null;
}

async function rpcSaveProject(id: string | null, input: ProjectInput) {
  const { data, error } = await client().rpc("save_project", {
    p_id: id,
    p_payload: {
      title: input.title,
      kind: input.kind,
      categoryId: input.categoryId || null,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      summary: input.summary,
      role: input.role,
      url: input.url,
      memo: input.memo,
      stacks: input.stacks,
    },
  });

  if (error) {
    fail(error, "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return data as string;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  validateProjectInput(input);
  const id = await rpcSaveProject(null, input);
  const project = await getProject(id);
  if (!project) throw new Error(NOT_FOUND);
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInput>,
): Promise<Project> {
  const current = await getProject(id);
  if (!current) throw new Error(NOT_FOUND);

  const merged: ProjectInput = { ...current, ...patch };
  validateProjectInput(merged);

  await rpcSaveProject(id, merged);

  const next = await getProject(id);
  if (!next) throw new Error(NOT_FOUND);
  return next;
}

export async function saveProjectRecords(
  id: string,
  records: Partial<Pick<Project, "troubles" | "learnings">>,
): Promise<Project> {
  const current = await getProject(id);
  if (!current) throw new Error(NOT_FOUND);

  const { error } = await client().rpc("save_project_records", {
    p_project_id: id,
    p_troubles: records.troubles ?? current.troubles,
    p_learnings: records.learnings ?? current.learnings,
  });

  if (error) {
    fail(error, "기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const next = await getProject(id);
  if (!next) throw new Error(NOT_FOUND);
  return next;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await client().from("projects").delete().eq("id", id);
  if (error) {
    fail(error, "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
