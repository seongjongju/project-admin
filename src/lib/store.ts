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

/** 프로젝트에 속한 개별 일정. 상태는 프로젝트 상태와 독립적이다. */
export type ProjectSchedule = {
  id: string;
  projectId: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ProjectStatus;
};

export type Project = {
  id: string;
  title: string;
  kind: ProjectKind;
  categoryId: string; // "" = 종류 없음
  category: string; // 화면 표시용 종류 이름 (읽기 전용)
  status: ProjectStatus; // 프로젝트 상태. 일정 상태와 서로 영향을 주지 않는다.
  startDate: string; // 일정에서 파생: 가장 이른 시작일. 일정 없으면 ""
  endDate: string; // 일정에서 파생: 가장 늦은 끝일. 일정 없으면 ""
  schedules: ProjectSchedule[];
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
  | "id"
  | "category"
  | "startDate"
  | "endDate"
  | "schedules"
  | "troubles"
  | "learnings"
>;

export type ScheduleInput = Omit<ProjectSchedule, "id" | "projectId">;

/** 달력은 프로젝트가 아니라 일정 단위로 읽는다. */
export type ScheduleItem = ProjectSchedule & { projectTitle: string };

export function flatScheduleItems(projects: Project[]): ScheduleItem[] {
  return projects.flatMap((project) =>
    project.schedules.map((schedule) => ({
      ...schedule,
      projectTitle: project.title,
    })),
  );
}

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
  project_schedules?: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    status: string;
  }[] | null;
  troubles?: { id: string; trouble: string; solution: string; position: number }[] | null;
  learnings?: { id: string; unknown: string; learned: string; position: number }[] | null;
};

const PROJECT_FIELDS =
  "id, title, kind, category_id, status, summary, role, url, memo, categories ( name ), project_stacks ( stacks ( name ) ), project_schedules ( id, title, start_date, end_date, status )";

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
    ["SCHEDULE_TITLE_REQUIRED", "일정 제목을 입력해 주세요."],
    ["SCHEDULE_DATE_REQUIRED", "일정의 시작날짜와 끝날짜를 입력해 주세요."],
    ["SCHEDULE_DATE_ORDER", "끝날짜는 시작날짜보다 빠를 수 없습니다."],
    ["SCHEDULE_STATUS_INVALID", "일정 상태를 다시 선택해 주세요."],
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

  const schedules = (row.project_schedules ?? [])
    .map<ProjectSchedule>((schedule) => ({
      id: schedule.id,
      projectId: row.id,
      title: schedule.title,
      startDate: schedule.start_date,
      endDate: schedule.end_date,
      status: schedule.status as ProjectStatus,
    }))
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
    );

  return {
    id: row.id,
    title: row.title,
    kind: row.kind as ProjectKind,
    categoryId: row.category_id ?? "",
    category: one(row.categories)?.name ?? "",
    status: row.status as ProjectStatus,
    // 프로젝트 기간은 일정에서만 계산한다. 일정이 없으면 빈 문자열.
    startDate: schedules.reduce(
      (min, item) => (!min || item.startDate < min ? item.startDate : min),
      "",
    ),
    endDate: schedules.reduce(
      (max, item) => (!max || item.endDate > max ? item.endDate : max),
      "",
    ),
    schedules,
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

  if (!isValidProjectUrl(input.url)) {
    throw new Error(
      "링크는 http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요.",
    );
  }
}

export function validateScheduleInput(input: ScheduleInput) {
  if (!input.title.trim()) throw new Error("일정 제목을 입력해 주세요.");
  if (!PROJECT_STATUSES.includes(input.status)) {
    throw new Error("일정 상태를 선택해 주세요.");
  }
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(input.startDate) || !datePattern.test(input.endDate)) {
    throw new Error("시작날짜와 끝날짜를 날짜 형식으로 입력해 주세요.");
  }
  if (input.endDate < input.startDate) {
    throw new Error("끝날짜는 시작날짜보다 빠를 수 없습니다.");
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
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return ((data ?? []) as unknown as ProjectRow[]).map(mapProjectRow);
}

export const PAGE_SIZE = 10;

export type ListFilter = {
  q: string;
  statuses: ProjectStatus[];
  from: string; // YYYY-MM-DD, 등록일 시작
  to: string; // YYYY-MM-DD, 등록일 끝
  page: number;
};

export type ProjectPage = { projects: Project[]; total: number };

export function parseStatuses(values: string[]): ProjectStatus[] {
  const found = new Set<ProjectStatus>();
  for (const value of values) {
    if (PROJECT_STATUSES.includes(value as ProjectStatus)) {
      found.add(value as ProjectStatus);
    }
  }
  return [...found];
}

export function readListFilter(params: URLSearchParams): ListFilter {
  const page = Number(params.get("page"));
  return {
    q: params.get("q") ?? "",
    statuses: parseStatuses(params.getAll("status")),
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function listQueryString(filter: ListFilter) {
  const params = new URLSearchParams();
  if (filter.q.trim()) params.set("q", filter.q.trim());
  for (const status of filter.statuses) params.append("status", status);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** PostgREST ilike에서 %, _, \ 는 literally 뜻할 때 backslash로 감싼다. */
export function ilikePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/** 한국 시간 하루의 시작·끝을 DB가 이해하는 timestamp로 바꾼다. */
export function createdAtBounds(from: string, to: string) {
  const key = /^\d{4}-\d{2}-\d{2}$/;
  return {
    from: key.test(from) ? `${from}T00:00:00+09:00` : "",
    to: key.test(to) ? `${to}T23:59:59+09:00` : "",
  };
}

export function totalPageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** 첫·마지막 페이지와 현재 페이지 주변만 보여주고, 사이가 비면 … 로 줄인다. */
export function pageWindow(current: number, totalPages: number): (number | "…")[] {
  const candidates = [...new Set([1, totalPages, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const pages: (number | "…")[] = [];
  let previous = 0;
  for (const page of candidates) {
    if (previous && page - previous > 1) pages.push("…");
    pages.push(page);
    previous = page;
  }
  return pages;
}

/** 목록 화면 전용 조회. 알림의 listProjects()는 전체 목록을 그대로 유지한다. */
export async function queryProjects(
  filter: ListFilter & { kind: ProjectKind },
): Promise<ProjectPage> {
  const page = Math.max(1, Math.floor(filter.page));
  const query = client()
    .from("projects")
    .select(PROJECT_FIELDS, { count: "exact" })
    .eq("kind", filter.kind);

  const name = filter.q.trim();
  if (name) query.ilike("title", ilikePattern(name));
  if (filter.statuses.length > 0) query.in("status", filter.statuses);
  const bounds = createdAtBounds(filter.from, filter.to);
  if (bounds.from) query.gte("created_at", bounds.from);
  if (bounds.to) query.lte("created_at", bounds.to);

  const { data, error, count } = await query
    .order("created_at", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) {
    fail(error, "프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return {
    projects: ((data ?? []) as unknown as ProjectRow[]).map(mapProjectRow),
    total: count ?? 0,
  };
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

/** 일정 추가·수정. 저장 후 프로젝트를 다시 읽어 파생 기간까지 갱신해 돌려준다. */
export async function upsertSchedule(
  projectId: string,
  input: ScheduleInput & { id?: string },
): Promise<Project> {
  validateScheduleInput(input);

  const { error } = await client().rpc("save_project_schedule", {
    p_project_id: projectId,
    p_payload: {
      id: input.id ?? null,
      title: input.title.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
    },
  });

  if (error) {
    fail(error, "일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const next = await getProject(projectId);
  if (!next) throw new Error(NOT_FOUND);
  return next;
}

export async function deleteSchedule(
  projectId: string,
  scheduleId: string,
): Promise<Project> {
  const { error } = await client()
    .from("project_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    fail(error, "일정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const next = await getProject(projectId);
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
