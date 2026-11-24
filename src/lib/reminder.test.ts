import { useRouter } from "next/navigation";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import ProjectReminder from "@/components/ProjectReminder";
import { addDays, toSeoulDateKey } from "./date";
import type { Project, ProjectSchedule, ProjectStatus } from "./store";
import { listProjects } from "./store";
import {
  NOTIFICATION_TITLE,
  reminderKey,
  REMINDER_DELAY_MS,
} from "./notification";

jest.mock("./store", () => ({ listProjects: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

const show = jest.fn();
const instances: FakeNotification[] = [];
class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = jest.fn(async () => {
    FakeNotification.permission = "granted";
    return "granted" as NotificationPermission;
  });
  onclick: (() => void) | null = null;
  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {
    instances.push(this);
    show(title, options);
  }
}
Object.defineProperty(globalThis, "Notification", {
  value: FakeNotification,
  writable: true,
  configurable: true,
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const projects = listProjects as jest.Mock;
const push = jest.fn();
const today = toSeoulDateKey(new Date());

function schedule(
  id: string,
  startDate: string,
  endDate: string,
  title: string,
): ProjectSchedule {
  return { id, projectId: id, title, startDate, endDate, status: "진행중" };
}

function project(
  id: string,
  schedules: ProjectSchedule[] = [],
  status: ProjectStatus = "진행중",
): Project {
  return {
    id,
    title: id,
    kind: "회사",
    categoryId: "",
    category: "",
    status,
    startDate: "",
    endDate: "",
    schedules,
    summary: "",
    role: "",
    url: "",
    memo: "",
    stacks: [],
    troubles: [],
    learnings: [],
  };
}

const both = [
  project("오늘시작", [schedule("s1", today, addDays(today, 5), "퍼블리싱")]),
  project("내일종료", [schedule("s2", addDays(today, -5), addDays(today, 1), "디자인")]),
  project("완료제외", [schedule("s3", today, addDays(today, 1), "제외")], "완료"),
];

let host: HTMLDivElement;
let root: Root;

async function render() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(ProjectReminder));
  });
}

async function unmount() {
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

async function waitTenMinutes() {
  await act(async () => {
    jest.advanceTimersByTime(REMINDER_DELAY_MS);
  });
}

function button() {
  return [...host.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === "알림 켜기",
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(globalThis, "Notification", {
    value: FakeNotification,
    writable: true,
    configurable: true,
  });
  window.localStorage.clear();
  show.mockClear();
  projects.mockClear();
  instances.length = 0;
  FakeNotification.requestPermission.mockClear();
  FakeNotification.permission = "default";
  projects.mockResolvedValue(both);
  push.mockClear();
  (useRouter as jest.Mock).mockReturnValue({ push });
});

afterEach(async () => {
  await unmount();
  jest.useRealTimers();
});

test("권한은 자동 요청하지 않고 알림 켜기 버튼을 누를 때만 요청한다", async () => {
  await render();
  expect(button()).toBeTruthy();
  expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();

  await act(async () => {
    button()?.click();
    await Promise.resolve();
  });

  expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
  expect(button()).toBeUndefined();
});

test("10분 뒤 대상을 하나의 알림으로 묶어 보내고 완료 프로젝트는 제외한다", async () => {
  FakeNotification.permission = "granted";
  await render();
  expect(button()).toBeUndefined();
  expect(show).not.toHaveBeenCalled();

  await waitTenMinutes();

  expect(show).toHaveBeenCalledTimes(1);
  expect(show.mock.calls[0][0]).toBe(NOTIFICATION_TITLE);
  expect(show.mock.calls[0][1]?.body).toBe(
    "오늘 시작: 오늘시작 - 퍼블리싱 / 내일 종료: 내일종료 - 디자인",
  );
  expect(window.localStorage.getItem(reminderKey(today))).toBe("1");
});

test("대상이 없으면 알림을 보내지 않는다", async () => {
  FakeNotification.permission = "granted";
  projects.mockResolvedValue([]);
  await render();
  await waitTenMinutes();
  expect(show).not.toHaveBeenCalled();
});

test("같은 날 다시 열어도 알림을 반복하지 않는다", async () => {
  FakeNotification.permission = "granted";
  await render();
  await waitTenMinutes();
  await unmount();

  await render();
  await waitTenMinutes();
  expect(show).toHaveBeenCalledTimes(1);
});

test("컴포넌트가 사라지면 타이머도 정리된다", async () => {
  FakeNotification.permission = "granted";
  await render();
  await unmount();
  await act(async () => {
    jest.advanceTimersByTime(REMINDER_DELAY_MS);
  });
  expect(show).not.toHaveBeenCalled();
});

test("권한이 거부되었으면 버튼도 알림도 없다", async () => {
  FakeNotification.permission = "denied";
  await render();
  expect(button()).toBeUndefined();
  await waitTenMinutes();
  expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
  expect(projects).not.toHaveBeenCalled();
});

test("Notification을 지원하지 않으면 조용히 넘어간다", async () => {
  Object.defineProperty(globalThis, "Notification", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  await render();
  expect(button()).toBeUndefined();
  await waitTenMinutes();
  expect(show).not.toHaveBeenCalled();
});

test("알림을 누르면 창을 앞으로 가져오고 대시보드로 이동한다", async () => {
  FakeNotification.permission = "granted";
  const focus = jest.fn();
  Object.defineProperty(window, "focus", { value: focus, writable: true });

  await render();
  await waitTenMinutes();
  instances[0].onclick?.();

  expect(focus).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith("/");
});
