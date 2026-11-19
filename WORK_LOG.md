# WORK_LOG.md

> 목적: 다른 모델이나 새 세션에서도 현재 작업 상태를 파악하고 안전하게 이어서 작업하기 위한 인수인계 기록입니다.
> 이 파일은 프로젝트 루트에 두고, 작업을 진행할 때마다 최신 상태로 갱신합니다.

## 1. 프로젝트 개요

- 프로젝트 목적: 작업한 프로젝트와 일정을 기록해 포트폴리오 자료로 쌓아 두는 개인용 관리자 웹앱
- 작업 범위: 1단계(화면 구조와 달력/프로젝트 목록) 기능 + 1단계 화면 디자인 개편
- 주요 기술 및 실행 환경: Next.js 16 App Router, TypeScript, Tailwind CSS v4, localStorage 기반 임시 저장소
- 참고해야 할 프로젝트 규칙: `AGENTS.md`, `기능정의서.md`

## 2. 현재 작업 상태

- 상태: 완료
- 마지막 업데이트: 2026-11-19
- 현재 작업: 1단계 내부 화면 디자인 개편
- 현재 작업 단계: 디자인 개편 구현 및 검증 완료. 다음 단계(프로젝트 기본 정보 입력 기능)는 시작하지 않음

## 3. 완료된 작업

| 작업 | 변경 파일 | 결과 및 확인 내용 |
|---|---|---|
| 디자인 토큰과 기본 서체 적용 | `src/app/globals.css`, `src/app/layout.tsx` | 승인된 색(accent `#1E5F57`, paper `#F4F5F2` 등)과 한국어 우선 시스템 서체를 Tailwind 테마에 한 번만 정의. Geist 웹폰트 제거 |
| LNB/모바일 메뉴 개편 | `src/app/(admin)/Sidebar.tsx`, `src/app/(admin)/layout.tsx` | 데스크톱 200px 레일, 활성 메뉴 2px 청록 왼쪽 선, 모바일 "메뉴" 텍스트 버튼 + 드로어. 기존 Esc/배경/라우팅/화면 폭 변경 시 자동 닫힘과 스크롤 잠금 유지 |
| 달력 개편 | `src/components/calendar/MonthGrid.tsx` | 외곽 카드 제거, 가로 구분선만 사용. 오늘 날짜 22px 청록 스탬프, 여러 날 일정은 24px 연청록 띠 + 시작점 2px 청록 캡, 주가 바뀌는 지점은 붙여서 표시. 하루 일정은 점 + 한 줄 제목. 드래그/터치 기간 조절 로직은 그대로 유지 |
| 홈 화면 개편 | `src/components/calendar/CalendarDashboard.tsx` | 26px(모바일 22px) 제목, 13px 보조 설명, 오류는 왼쪽 위험 색 선으로 표시 |
| 팝업 개편 | `src/components/ui/Modal.tsx` | 모바일 하단 시트 / 데스크톱 480px 중앙 시트, 1px 테두리·그림자 없음. 기존 포커스 이동/복귀, 포커스 트랩, Esc·배경 닫기, 내부 스크롤, 페이지 스크롤 잠금 유지 |
| 일정 등록·상세 개편 | `src/components/calendar/ScheduleForm.tsx`, `src/components/calendar/ScheduleDetail.tsx` | 입력 라벨 13px, 기본 버튼 먹색, 보조 버튼 텍스트형. 상세는 기간을 청록 숫자로, 메모는 구분선으로 분리. 삭제는 확인 문구를 거친 뒤 위험 색 버튼으로 실행 |
| 프로젝트 탭/목록 개편 | `src/components/projects/ProjectsView.tsx` | 상태 탭 2px 밑줄, 목록 카드 대신 가로 구분선, 프로젝트명 17px. 진행 상태 필터 동작은 그대로 유지 |

## 4. 진행 중인 작업

- 작업 내용: 없음
- 현재까지 구현한 내용: 1단계 화면 디자인 개편 완료
- 아직 완료되지 않은 부분: 1단계 이후 기능(프로젝트 입력 폼, 스택, 배운점/몰랐던 점/해결한 점, 달력 작업 기록, 인증, Supabase 연동)
- 작업을 이어가기 위해 필요한 정보: 다음 단계는 `AGENTS.md`의 단계 순서에 따라 사용자 확인 후 시작

## 5. 주요 결정 사항

| 결정 사항 | 결정한 이유 | 관련 파일 |
|---|---|---|
| 색·서체·여백을 Tailwind `@theme` 토큰으로 통일 | 화면마다 색을 반복 지정하지 않고 한 곳에서 바꾸기 위해 | `src/app/globals.css` |
| Geist 대신 한국어 우선 시스템 서체 사용 | 한글 본문 품질을 우선하고 새 웹폰트 요청을 만들지 않기 위해 | `src/app/layout.tsx` |
| 달력 외곽 카드 제거, 가로 구분선만 사용 | 회색 박스가 겹치는 기본형 화면을 피하고 날짜 자체를 주인공으로 만들기 위해 | `src/components/calendar/MonthGrid.tsx` |
| 하루 일정은 채운 알약 대신 점 + 제목 | 짧은 일정이 여러 개 있어도 달력이 막대밭처럼 보이지 않게 하기 위해 | `src/components/calendar/MonthGrid.tsx` |
| 모바일 팝업은 하단 시트, 데스크톱은 중앙 480px 시트 | 작은 화면에서 손이 닿는 위치를 유지하고, 큰 화면에서는 폼 폭을 읽기 좋게 제한하기 위해 | `src/components/ui/Modal.tsx` |
| 데스크톱 LNB 200px, 활성 메뉴 왼쪽 2px 선 | 채워진 알약 없이 현재 위치를 표시하는 정밀한 작업 일지 톤 | `src/app/(admin)/Sidebar.tsx` |

## 6. 문제 및 해결 기록

| 발생한 문제 | 원인 | 해결 방법 | 관련 파일 |
|---|---|---|---|
| 하루 일정 호버 시 오른쪽 조절 손잡이가 빈 칸에 떠 보임 | 일정 버튼이 칸 전체 폭을 차지해 손잡이가 칸 경계에 붙었음 | 하루 일정만 내용 폭(`w-fit max-w-full`)으로 줄이고 손잡이를 글자 양끝에 붙임 | `src/components/calendar/MonthGrid.tsx` |
| 모바일 팝업 배경 클릭 검증 좌표가 시트 안쪽을 눌렀음 | 팝업이 중앙 카드에서 하단 시트로 바뀌어 화면 아래쪽이 패널 영역이 됨 | 검증 스크립트에서 화면 위쪽(y=40) 배경을 클릭하도록 수정 | 검증 스크립트(임시, 저장소 외부) |
| AGENTS.md와 기능정의서의 스타일 기준이 다름 | AGENTS.md는 일반 CSS, 기능정의서는 Tailwind로 적혀 있음 | 상위 기준인 `기능정의서.md`와 승인된 작업 방향에 따라 Tailwind 유지. 사용자에게 차이를 보고 | `AGENTS.md`, `기능정의서.md` |

## 7. 수정 파일 목록

| 파일 경로 | 변경 내용 | 변경 이유 |
|---|---|---|
| `src/app/globals.css` | 디자인 토큰, 기본 배경/글자/포커스 스타일 | 색·서체를 한 곳에서 관리 |
| `src/app/layout.tsx` | Geist 폰트 제거, 한국어 우선 서체 | 한글 본문 품질과 불필요한 웹폰트 제거 |
| `src/app/(admin)/layout.tsx` | 페이지 여백/폭 조정 | 16/32/40px 여백 리듬 적용 |
| `src/app/(admin)/Sidebar.tsx` | LNB, 모바일 드로어 스타일 개편 | 현재 위치를 선으로 표시하는 미니멀 톤 |
| `src/app/(admin)/page.tsx` 외 2개 페이지 | 변경 없음 | 라우팅 구조 유지 |
| `src/components/calendar/MonthGrid.tsx` | 달력/일정 막대 스타일 개편, 하루 일정 손잡이 위치 수정 | 달력 가독성과 조절 동작 개선 |
| `src/components/calendar/CalendarDashboard.tsx` | 제목/오류/로딩 스타일 | 화면 위계 정리 |
| `src/components/calendar/ScheduleForm.tsx` | 폼 입력/버튼 스타일 | 팝업 톤 통일 |
| `src/components/calendar/ScheduleDetail.tsx` | 상세/삭제 확인 스타일 | 읽기 순서와 위험 동작 구분 |
| `src/components/ui/Modal.tsx` | 모바일 하단 시트/데스크톱 중앙 시트 | 반응형 팝업 경험 개선 |
| `src/components/projects/ProjectsView.tsx` | 탭/목록/빈 상태 스타일 | 카드 나열 대신 기록장 같은 목록 |
| `src/lib/store.ts`, `src/lib/date.ts` | 변경 없음 | 기능과 데이터 구조 보존 |

## 8. 남은 작업 및 다음 단계

1. 사용자 확인 후 2단계(프로젝트 기본 정보 입력/목록/삭제) 구현
2. 이후 `AGENTS.md` 순서대로 스택 선택, 시작/완료 버튼, 배운점/몰랐던 점/해결한 점, 달력 작업 기록 진행
3. Supabase 연동 및 RLS, 테스트 계정, README, Vercel 배포 안내는 해당 단계에서 진행

## 9. 주의 사항 및 미해결 사항

- 확인되지 않은 내용: 실제 Supabase 연동과 로그인은 아직 구현되지 않아 확인하지 못함
- 추가 승인이 필요한 작업: 1단계 이후 기능은 요청 전까지 만들지 않음
- 수정 시 주의할 기존 동작: 팝업 Esc/배경 닫기와 포커스 복귀, 내부만 스크롤, 마우스·터치 기간 조절, 삭제 확인, 상태 탭 필터는 그대로 유지해야 함
- 기타: 데이터 키(`project-admin:schedules`, `project-admin:projects`)와 저장 구조는 변경하지 않음. 디자인 검증은 `npm run lint`, `npm run build`, 320/768/1280 브라우저 확인(35개 항목)으로 수행

---

## 에이전트 인수인계 메모

다음 작업을 시작하기 전에 이 기록과 `AGENTS.md`를 함께 읽으세요.

- 완료된 작업을 다시 구현하지 않습니다.
- 진행 중인 작업의 실제 코드 상태를 관련 파일에서 확인한 뒤 이어서 작업합니다.
- 기록과 실제 코드가 다르면 실제 코드를 기준으로 확인하고, 차이를 사용자에게 알린 뒤 기록을 바로잡습니다.
- 추측으로 완료 여부나 테스트 결과를 작성하지 않습니다.
- 새 작업이 끝나면 이 파일을 갱신하고, 변경 파일과 검증 결과를 기록합니다.
- 토큰 또는 컨텍스트 한도에 가까워졌거나 모델/세션을 변경하기 전에는 현재 상태, 미완료 작업, 다음 단계부터 먼저 기록합니다.
- 회사 프로젝트의 Git 사용 금지 및 외부 업로드 금지 등 `AGENTS.md`의 모든 제한을 계속 준수합니다.

---

## 10. 2026-11-19 추가 작업: 일정 = 프로젝트 통합 및 화면 확장

> 아래 내용이 위 기록의 "현재 상태"를 대신한다. 위 기록은 당시 이력으로 그대로 둔다.

### 10-1. 상태

- 상태: 완료 (요청 범위 기준)
- 구현: 일정과 프로젝트 데이터를 하나로 통합, 상태 3가지, 상세 페이지, 큰 달력, 이번 달 목록, 입력란 확장, Pretendard, 글자 크기/커서 규칙
- 검증: `npm run lint`, `npm test`, `npm run build` 통과. 320/768/1280 브라우저 확인
- 하지 않은 것: 로그인, Supabase 연결, 목록 필터, 배운점 기록

### 10-2. 주요 변경

| 구분 | 변경 내용 | 관련 파일 |
|---|---|---|
| 데이터 통합 | `Schedule` 제거, `Project` 하나로 통합. `title`, `kind`, `category`, `status`(3가지), `startDate`, `endDate`, `summary`, `role`, `url`, `memo`, `stacks` | `src/lib/store.ts` |
| 저장 키 버전 분리 | `project-admin:v2:projects`, `project-admin:v2:options` 사용. 기존 키는 읽지 않고 남겨 둠. 손상된 값은 샘플로 복구 | `src/lib/store.ts` |
| 옵션 중복 방지 | 스택/종류를 대소문자 무시로 비교해 기존 표기를 재사용. 개인 프로젝트는 종류를 비움 | `src/lib/store.ts` |
| 샘플 | 오늘 기준 상대 날짜로 7개. 세 상태, 회사/개인, 이번 달 시작 진행중, 이번 달 종료 완료, 지난 달 프로젝트 포함 | `src/lib/store.ts` |
| 달력 | LNB 제외 전체 폭, 주 칸 정사각형 이상, 넘치면 그 주만 확장, 3색 막대와 글자 범례, 320px 점/개수 + 그날 목록 팝업 | `src/components/calendar/MonthGrid.tsx` |
| 팝업 | 등록/상세/수정/그날 목록을 한곳에서 관리. 삭제 확인, 상세 팝업 유지 | `src/components/calendar/CalendarDashboard.tsx` |
| 폼 | 필수/선택 입력, 상태 라디오, 종료일 최소값, URL 검사, 회사일 때만 종류 표시, 스택 칩 | `src/components/projects/ProjectForm.tsx`, `ProjectOptionFields.tsx` |
| 상세 페이지 | `/projects/[id]` 모든 정보 표시, 수정 팝업, 삭제 후 목록 이동, 없는 id 안내, 목록 돌아가기 | `src/components/projects/ProjectDetail.tsx`, `ProjectDetailPage.tsx` |
| 목록 | 3개 탭(기본 진행예정), 상태로만 필터, 행 전체가 상세 링크 | `src/components/projects/ProjectsView.tsx` |
| 이번 달 목록 | 진행중+이번 달 시작 / 완료+이번 달 종료, 이름+회사·개인 배지 | `src/components/projects/MonthlyProjects.tsx` |
| 글꼴 | Pretendard Variable 1.3.9 dynamic subset을 jsDelivr `<link>` + preconnect로 로드, 테마 sans 한 곳 정의 | `src/app/layout.tsx`, `src/app/globals.css` |
| 글자/커서 | `--text-ui`(14→16), `--text-title` 등 테마 토큰만 사용. 13px 미만 없음. pointer/not-allowed/ew-resize 전역 규칙 | `src/app/globals.css` |
| 문서 | 통합 모델, 상태·색, 3탭, 달력 크기·이번 달 목록, 상세 페이지, 입력란, 글자 규칙, 단계표, 미정 정리 | `기능정의서.md` |

### 10-3. 테스트

- `jest` + `ts-jest` + `jest-environment-jsdom` 구성. Next 16의 `next/jest` 변환기가 이 환경에서 동작하지 않아 ts-jest로 대체 (`jest.config.js`)
- `src/lib/store.test.ts` 6개: 샘플 세 상태, 스택/종류 대소문자 중복, 생성·수정·삭제·조회, 종료일 역전 거부, 잘못된 링크 거부, 개인 프로젝트 종류 비움
- `npm test` 6/6 통과

### 10-4. 문제 및 해결

| 문제 | 원인 | 해결 |
|---|---|---|
| `/projects/[id]` 빌드 실패 (`usePathname()` outside Suspense) | 동적 경로를 미리 렌더할 때 LNB의 `usePathname()`이 막힘 | 페이지에 `export const instant = false` 추가 |
| Jest 변환 모듈을 찾지 못함 | 이 환경에서 `next/jest`의 swc 변환기 경로가 없고, Jest 30 설정 해석이 모듈을 찾지 못함 | Jest 29 계열 + `ts-jest`로 구성 |
| 기존 localStorage 구조 변경 | 일정/프로젝트가 하나로 합쳐짐 | 버전 키(`v2`)로 새로 시작하고 예전 키는 무시 |

### 10-5. 브라우저 검증 (headless Chrome, 320/768/1280)

- 320px: 가로 스크롤 없음, 본문 14px, Pretendard, 7칸 유지, 점/개수 표시, 개수 → 그날 목록 팝업, 상세/수정 팝업 내부 스크롤, 13px 미만 없음
- 768/1280: 본문·탭·막대 16px 이상, 달력이 본문 폭 전체 사용, 주 칸이 정사각형 이상, 이번 달 두 목록과 배지, 가로 스크롤 없음
- 동작: 생성(필수값 검증, 종류·스택 저장, 소문자 스택이 기존 표기로 합쳐짐), 달력 상세 팝업, 상세 페이지 상태 변경, 목록 행 링크, 막대 드래그로 종료일 변경, 삭제 확인 후 달력·목록에서 제거, 없는 id 안내, 팝업 열린 동안 페이지 스크롤 잠금
- 막대 색: 진행예정 회색 `rgb(232,234,228)`, 진행중 연청록 `rgb(231,240,236)`, 완료 먹색 `rgb(27,29,27)`로 서로 구분됨. 글자 범례 존재
- 콘솔 오류 없음. 검증 중 검사식이 잘못 짚은 항목(주 칸 높이를 날짜 버튼으로 측정, 팝업 바깥 div의 overflow 측정 등)은 검사식을 고쳐 다시 확인함

### 10-6. 남은 작업

1. 목록 필터(날짜/스택/종류) — 3개 상태 탭 안에서 각각 적용
2. 배운점/몰랐던 점/해결한 점 기록
3. Supabase 연결, 로그인/RLS, 테스트 계정, README, Vercel 배포

### 10-7. 주의

- `AGENTS.md`의 "시작/완료 버튼"과 `기능정의서.md`의 "시작일·종료일 직접 입력 + 상태 수동 선택"이 다름. 상위 기준인 기능정의서를 따랐고, 문서에도 차이를 적어 둠
- 기존 localStorage 키는 마이그레이션하지 않으므로 이전 테스트 데이터는 화면에 나오지 않음
- 개발 서버의 Next 표시(N 배지)는 개발 모드에서만 보임

## 11. 2026-11-19 추가 작업: 홈 목록·배경·영역 구분·요일/공휴일 색

### 11-1. 주요 변경

| 항목 | 내용 | 파일 |
|---|---|---|
| 이번 달 진행예정 목록 | 홈 달력 아래 목록을 진행예정 → 진행중 → 완료 3개 패널로 재작성. 기준은 `status` + 시작일(완료는 종료일)이 이번 달. 이전의 "진행예정 제외" 규칙 삭제 | `src/components/projects/MonthlyProjects.tsx` |
| 샘플 | 이번 달에 시작하는 진행예정 샘플 `company-design-system` 추가 (오늘 +7일) | `src/lib/store.ts` |
| 배경 | `--color-page` 추가, `body`는 `bg-page`(흰색), 데스크톱 LNB만 `bg-paper`(기존 종이색) | `src/app/globals.css`, `src/app/(admin)/Sidebar.tsx` |
| 영역 구분 | 달력은 "일정 달력" 제목 + 1px 테두리 카드, 아래 목록은 "이번 달 프로젝트" 제목 + 패널마다 1px 테두리. 두 영역 사이 `border-t` + 32px 간격. 그림자·그라디언트 없음 | `src/components/calendar/CalendarDashboard.tsx`, `MonthlyProjects.tsx` |
| 요일·공휴일 색 | `--color-sunday: #B3261E`, `--color-saturday: #1D4ED8`를 테마에만 정의. 요일 헤더·날짜 숫자에 적용, 공휴일은 주말보다 우선. 범례에 "빨강 = 일요일·공휴일, 파랑 = 토요일". 공휴일 이름은 1280px 이상에서만 날짜 옆 표시 | `src/app/globals.css`, `src/components/calendar/MonthGrid.tsx` |
| 공휴일 데이터 | `korea-holidays@0.2.0` 설치(의존성 0, gzip 4.45KB). 라이브러리 결과에 수동 목록을 덮어쓰는 방식, 연도별 Map 캐시. 지원 연도(2024~2027) 밖은 수동 목록만 사용 | `src/lib/holidays.ts`, `package.json` |
| 색 조정 | 흰 배경에서 경계가 보이도록 `--color-line` `#DDE1DB` → `#D2D7D0`, `--color-planned` `#E8EAE4` → `#E1E4DC`, `--color-planned-ink` `#555B55` → `#4F554F` | `src/app/globals.css` |
| 문서 | 홈 H-12~H-14, 이번 달 목록 P-06 규칙, 변경 이력 갱신 | `기능정의서.md` |

### 11-2. 검증

- `npm run build` 통과, `npm test` 6/6 통과
- headless Chrome 1280/1024/768/320: 흰 배경·LNB 종이색, 섹션 제목과 테두리, 패널 3개 순서, 진행예정 샘플 표시, 진행/완료 규칙 유지, 320·768 세로 스택, 가로 스크롤 없음
- 날짜 색: 일요일 `rgb(179,38,30)`, 토요일 `rgb(29,78,216)`, 평일 기본색. 대비 6.54:1 / 6.70:1, 진행예정 막대 글자 5.95:1 (모두 4.5:1 이상)
- 공휴일: 2026-06-03 지방선거일, 2026-10-03 개천절 / 10-05 대체공휴일(개천절) / 10-09 한글날이 빨강 + 이름으로 표시. 2028-01로 이동해도 오류 없이 일요일만 빨강(지원 연도 밖 수동 목록만 사용)
- 글자 크기 14px(320) / 16px(1280) 미만 없음, 콘솔 오류 없음

### 11-3. 확인이 필요한 사항

- `korea-holidays`는 2024~2027만 지원한다. 2028년 이후는 수동 목록에만 의존하므로, 2027년 말에 라이브러리 업데이트나 수동 목록 보충이 필요하다
- 2027년 데이터는 라이브러리 기준 잠정값이다. timeanddate 2027 목록과 설날(2/7)·추석(9/15)·대체공휴일 날짜는 일치했지만, 국내 공식 발표와 다시 대조하는 것이 좋다
- 다크 모드는 이 앱에 없다(`color-scheme: light`만 있고 `dark:` 규칙 0개). 이번 작업에서도 추가하지 않았다

## 12. 2026-11-19 추가 작업: 달력 헤더 굵기/색, 상세 페이지 기록 2개 섹션

### 12-1. 주요 변경

| 항목 | 내용 | 파일 |
|---|---|---|
| 달력 범례 | 요일 색 범례("빨강 = …, 파랑 = …") 삭제. 상태 색 범례는 유지 | `src/components/calendar/MonthGrid.tsx` |
| 요일 헤더 | 7개 모두 `font-strong`(600) + 일요일 빨강 / 토요일 파랑 / 평일 기본색 | `MonthGrid.tsx` |
| 날짜 숫자 | 일·토·공휴일만 굵기 600, 평일은 기존 굵기 유지 (공휴일은 주말보다 우선) | `MonthGrid.tsx` |
| 테마 | `--font-weight-strong: 600` 추가. 색은 기존 `--color-sunday`, `--color-saturday` 사용 (컴포넌트에 숫자·hex 없음) | `src/app/globals.css` |
| 기록 데이터 | `Project`에 `troubles`(`id`, `trouble`, `solution`) / `learnings`(`id`, `unknown`, `learned`) 추가. `ProjectInput`에서는 제외해 기존 폼은 그대로 | `src/lib/store.ts` |
| 읽기 보호 | 읽을 때 배열/문자열 여부 확인, 예전 `text` 한 칸 항목은 첫 칸으로 이동, 빈 항목은 제거 | `store.ts` |
| 저장 | `saveProjectRecords(id, patch)` 추가. 프로젝트 수정 시 기록 유지, 새 프로젝트는 빈 배열로 생성 | `store.ts` |
| 기록 UI | `ProjectRecords` 신규: 두 섹션, 작성 중/작성 완료 상태, 완료·수정·삭제, 빈 안내, 저장 실패 안내, 번호 붙은 라벨 | `src/components/projects/ProjectRecords.tsx` |
| 상세 페이지 | `ProjectDetail`에 children 슬롯을 두고 기본 정보와 수정/삭제 버튼 사이에 기록 섹션 배치 | `ProjectDetail.tsx`, `ProjectDetailPage.tsx` |
| 테스트 | 기록 저장·예전 `text` 변환·이상한 값·프로젝트 수정 후 유지 테스트 1개 추가 (총 7개) | `src/lib/store.test.ts` |
| 문서 | 달력 헤더/날짜 굵기, 범례 삭제, 4-7 기록 두 섹션 규칙과 예외 처리, 데이터 구조(로컬·Supabase), 미정/해결 항목, 변경 이력 | `기능정의서.md` |

### 12-2. 검증

- `npm run build` 통과, `npm test` 7/7 통과
- headless Chrome 1280: 요일 헤더 7개 모두 `font-weight: 600`, 일요일 `rgb(179,38,30)` / 토요일 `rgb(29,78,216)` / 평일 기본색. 날짜 숫자 일·토·공휴일 600, 평일 400. 요일 색 범례 문구 없음, 상태 범례 유지
- 상세 페이지: 빈 안내 문구 2개와 "+ 추가" 2개, 추가 시 textarea 한 짝 + 첫 칸 포커스 + `트러블슈팅 1`/`해결방법 1` 라벨, 두 칸 비우면 완료 차단, 한 칸만 채우면 완료 + 빈 칸 "아직 작성하지 않았어요", 새로고침 후 유지, 수정 시 기존 내용 유지, 빈 작성 중 항목은 확인 없이 삭제, 저장된 항목은 확인 후 삭제
- 저장 실패(`Storage.prototype.setItem`을 던지게 함): 안내 문구 표시 + 작성 중 내용 유지
- 320px: 두 칸 세로 배치, 가로 스크롤 없음, 버튼 높이 40px. 768px: 가로 배치, 가로 스크롤 없음. 1280px: 두 칸 가로 배치. 글자 14px(320) / 16px(1280) 미만 없음. 콘솔 오류 없음
- 저장 직후 dev 콘솔에 같은 `key` 경고가 떠서 `ProjectRecords`의 새 항목 목록 생성에 이미 저장된 id를 제외하는 조건을 추가(`!items.some(...)`). 프로덕션 서버(`npm start`)에서 같은 36개 검사를 다시 돌려 36/36 통과, 콘솔 오류 0건 확인 (`Runtime.consoleAPICalled` error도 수집)

### 12-3. 확인이 필요한 사항

- 기록은 localStorage에 저장하므로 브라우저를 바꾸면 보이지 않는다. Supabase 단계에서 `troubles` / `learnings` 테이블로 옮길 예정
- 기존 저장 데이터에 `troubles` / `learnings`가 없는 경우 빈 목록으로 읽는다. 예전 `text` 한 칸 형태는 코드상 지원하지만 실제로 그런 데이터는 아직 없다
