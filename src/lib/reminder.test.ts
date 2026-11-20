import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import ProjectReminder from "@/components/ProjectReminder";
import { addDays, toDateKey } from "./date";
import type { Project } from "./store";
import { listProjects } from "./store";
import { PERMISSION_KEY, REMINDER_DELAY_MS } from "./notification";

jest.mock("./store", () => ({ listProjects: jest.fn() }));

const show = jest.fn();
class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = jest.fn(async () => {
    FakeNotification.permission = "granted";
    return "granted" as NotificationPermission;
  });
  constructor(title: string, options?: NotificationOptions) {
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

function project(): Project {
  const today = toDateKey(new Date());
  return {
    id: "p1",
    title: "알림 테스트",
    kind: "회사",
    categoryId: "",
    category: "",
    status: "진행중",
    startDate: today,
    endDate: addDays(today, 1),
    summary: "",
    role: "",
    url: "",
    memo: "",
    stacks: [],
    troubles: [],
    learnings: [],
  };
}

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

async function waitTenMinutes() {
  await act(async () => {
    jest.advanceTimersByTime(REMINDER_DELAY_MS);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  show.mockClear();
  projects.mockClear();
  FakeNotification.requestPermission.mockClear();
  FakeNotification.permission = "default";
  projects.mockResolvedValue([project()]);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
  jest.useRealTimers();
});

test("10분 뒤 두 조건 알림을 띄우고 권한은 한 번만 요청한다", async () => {
  await render();
  expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
  expect(show).not.toHaveBeenCalled();

  await waitTenMinutes();

  const bodies = show.mock.calls.map((call) => call[1]?.body);
  expect(bodies).toEqual([
    `오늘 시작하는 프로젝트: 알림 테스트`,
    `내일 끝나는 프로젝트: 알림 테스트`,
  ]);
  expect(window.localStorage.getItem(PERMISSION_KEY)).toBe("1");
});

test("같은 날 다시 열면 권한 요청도 알림도 하지 않는다", async () => {
  await render();
  await waitTenMinutes();
  expect(show).toHaveBeenCalledTimes(2);

  await act(async () => {
    root.unmount();
  });
  await render();
  await waitTenMinutes();

  expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
  expect(show).toHaveBeenCalledTimes(2);
});

test("대상 프로젝트가 없으면 알림을 보내지 않는다", async () => {
  projects.mockResolvedValue([]);
  await render();
  await waitTenMinutes();

  expect(show).not.toHaveBeenCalled();
});

test("이미 권한을 거부했으면 조용히 넘어간다", async () => {
  FakeNotification.permission = "denied";
  window.localStorage.setItem(PERMISSION_KEY, "1");
  await render();
  await waitTenMinutes();

  expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
  expect(projects).not.toHaveBeenCalled();
});
