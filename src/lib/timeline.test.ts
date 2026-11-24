import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import ProjectTimeline from "@/components/projects/ProjectTimeline";
import { addDays, formatRangeCompact, toDateKey } from "./date";
import type { Project, ScheduleInput } from "./store";

// korea-holidays는 ESM 전용이라 Jest(CommonJS)에서 불러오지 못한다.
jest.mock("korea-holidays", () => ({
  getHolidays: jest.fn(() => []),
  SUPPORTED_YEARS: [2026],
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

const resizeCallbacks: ResizeObserverCallback[] = [];
class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

const today = toDateKey(new Date());
const start = addDays(today, -2);
const end = addDays(today, 3);

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    title: "시드 프로젝트",
    kind: "회사",
    categoryId: "",
    category: "",
    status: "진행중",
    startDate: start,
    endDate: end,
    schedules: [
      {
        id: "s1",
        projectId: "p1",
        title: "메인페이지 작업",
        startDate: start,
        endDate: end,
        status: "진행중",
      },
    ],
    summary: "",
    role: "",
    url: "",
    memo: "",
    stacks: [],
    troubles: [],
    learnings: [],
    ...overrides,
  };
}

let host: HTMLDivElement;
let root: Root;
const onSaveSchedule = jest.fn();
const onDeleteSchedule = jest.fn();

async function render(value: Project) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(ProjectTimeline, {
        project: value,
        onSaveSchedule,
        onDeleteSchedule,
      }),
    );
  });
}

async function unmount() {
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

function allButtons() {
  return [...host.querySelectorAll("button")];
}

function dayCells() {
  return allButtons().filter((item) =>
    item.getAttribute("aria-label")?.includes("더블클릭으로 일정 등록"),
  );
}

async function setWidth(width: number) {
  await act(async () => {
    resizeCallbacks.forEach((callback) =>
      callback(
        [{ contentRect: { width } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      ),
    );
  });
}

function button(label: string) {
  return allButtons().find((item) =>
    item.getAttribute("aria-label")?.includes(label),
  );
}

function pointer(type: string, clientX: number, target: EventTarget) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientX", { value: clientX });
  Object.defineProperty(event, "button", { value: 0 });
  target.dispatchEvent(event);
}

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  onSaveSchedule.mockClear();
  onDeleteSchedule.mockClear();
  resizeCallbacks.length = 0;
});

afterEach(async () => {
  await unmount();
});

test("35일 칸과 일정 바, 상태 색 범례를 보여준다", async () => {
  await render(project());

  const cells = dayCells();
  expect(cells).toHaveLength(35);
  expect(cells[0].textContent).toMatch(/^\d{1,2}$/);

  const bar = host.querySelector("[data-schedule-bar]");
  expect(bar?.getAttribute("title")).toBe(
    `메인페이지 작업 · ${formatRangeCompact(start, end)} · 진행중`,
  );
  expect(bar?.textContent).toContain("메인페이지 작업");
  expect(host.textContent).toContain("«");
  expect(host.textContent).toContain("오늘");
});

test("컨테이너 폭에 맞춰 칸 수를 정하고 오른쪽 끝까지 채운다", async () => {
  await render(project());
  await setWidth(320);

  const cells = dayCells();
  expect(cells).toHaveLength(11);
  expect(Number.parseFloat(cells[0].style.width)).toBeCloseTo(100 / 11, 2);
  const bar = host.querySelector("[data-schedule-bar]") as HTMLElement;
  expect(Number.parseFloat(bar.style.width)).toBeCloseTo((6 / 11) * 100, 2);

  await setWidth(5000);
  expect(dayCells()).toHaveLength(100);
});

test("주간 이동으로 다음 달이 시작되는 칸은 월/일로 표시한다", async () => {
  await render(project({ schedules: [] }));
  await setWidth(320);

  let found = false;
  for (let step = 0; step < 6; step += 1) {
    found = dayCells().some((cell) => /^\d+\/1$/.test(cell.textContent ?? ""));
    if (found) break;
    const next = button("일주일 후");
    await act(async () => {
      next!.click();
    });
  }
  expect(found).toBe(true);
});

test("날짜를 더블클릭하면 그 날짜가 기본값인 일정 등록 팝업이 열린다", async () => {
  await render(project({ schedules: [] }));
  const day = addDays(today, 5);
  const cell = button(`${day} 더블클릭으로 일정 등록`);
  expect(cell).toBeTruthy();

  await act(async () => {
    cell!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });

  const dialog = host.querySelector('[role="dialog"]');
  expect(dialog?.textContent).toContain("일정 등록");
  expect((host.querySelector("#schedule-start") as HTMLInputElement).value).toBe(
    day,
  );
  expect((host.querySelector("#schedule-end") as HTMLInputElement).value).toBe(
    day,
  );
});

test("끝날짜가 시작날짜보다 빠르면 저장을 막고 안내한다", async () => {
  await render(project({ schedules: [] }));
  const day = addDays(today, 5);
  const cell = button(`${day} 더블클릭으로 일정 등록`);
  await act(async () => {
    cell!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });

  const title = host.querySelector("#schedule-title") as HTMLInputElement;
  const startInput = host.querySelector("#schedule-start") as HTMLInputElement;
  const endInput = host.querySelector("#schedule-end") as HTMLInputElement;
  await act(async () => {
    setValue(title, "잘못된 일정");
    setValue(startInput, addDays(day, 3));
    setValue(endInput, day);
    host.querySelector("form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });

  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "끝날짜는 시작날짜보다 빠를 수 없습니다.",
  );
  expect(onSaveSchedule).not.toHaveBeenCalled();
});

test("팝오버에서 일정 상태를 바꾸면 저장한다", async () => {
  await render(project());
  const bar = host.querySelector("[data-schedule-bar]") as HTMLElement;

  await act(async () => {
    bar.click();
  });

  const menu = host.querySelector("[data-schedule-popover]");
  expect(menu?.textContent).toContain("수정");
  expect(menu?.textContent).toContain("삭제");

  const done = [...menu!.querySelectorAll("button")].find(
    (item) => item.textContent === "완료",
  );
  await act(async () => {
    done!.click();
  });

  expect(onSaveSchedule).toHaveBeenCalledWith("p1", {
    id: "s1",
    title: "메인페이지 작업",
    startDate: start,
    endDate: end,
    status: "완료",
  } satisfies ScheduleInput & { id?: string });
});

test("바를 끌면 전체 일정이 이동하고, 끝 손잡이는 끝날짜만 바꾼다", async () => {
  await render(project());
  const bar = host.querySelector("[data-schedule-bar]") as HTMLElement;

  await act(async () => {
    pointer("pointerdown", 100, bar);
  });
  await act(async () => {
    pointer("pointermove", 156, window);
  });
  await act(async () => {
    pointer("pointerup", 156, window);
  });

  expect(onSaveSchedule).toHaveBeenCalledWith("p1", {
    id: "s1",
    title: "메인페이지 작업",
    startDate: addDays(start, 2),
    endDate: addDays(end, 2),
    status: "진행중",
  });

  onSaveSchedule.mockClear();
  const edge = button("메인페이지 작업 끝날짜 조절");
  await act(async () => {
    pointer("pointerdown", 100, edge!);
  });
  await act(async () => {
    pointer("pointermove", 128, window);
  });
  await act(async () => {
    pointer("pointerup", 128, window);
  });

  expect(onSaveSchedule).toHaveBeenCalledWith("p1", {
    id: "s1",
    title: "메인페이지 작업",
    startDate: start,
    endDate: addDays(end, 1),
    status: "진행중",
  });
});

test("클릭은 팝오버를 열고 저장하지 않으며, 취소된 드래그는 되돌린다", async () => {
  await render(project());
  const bar = host.querySelector("[data-schedule-bar]") as HTMLElement;

  await act(async () => {
    pointer("pointerdown", 100, bar);
    pointer("pointerup", 100, window);
    bar.click();
  });
  expect(onSaveSchedule).not.toHaveBeenCalled();
  expect(host.querySelector("[data-schedule-popover]")).toBeTruthy();

  await act(async () => {
    pointer("pointerdown", 100, bar);
    pointer("pointermove", 156, window);
    pointer("pointercancel", 156, window);
  });
  expect(onSaveSchedule).not.toHaveBeenCalled();
  expect(bar.getAttribute("title")).toContain(formatRangeCompact(start, end));
});
