import {
  MAX_FILE_BYTES,
  MAX_FILE_COUNT,
  formatFileSize,
  isImageFileName,
  storageFileName,
  validateFiles,
} from "./files";

function file(name: string, size = 8) {
  const value = new File(["x"], name);
  Object.defineProperty(value, "size", { value: size });
  return value;
}

test("이미지·문서·압축파일은 첨부할 수 있다", () => {
  expect(
    validateFiles([
      file("캡처.PNG"),
      file("보고서.hwp"),
      file("정산.xlsx"),
      file("기획.docx"),
      file("자료.zip"),
    ]),
  ).toBe("");
});

test("실행 파일은 왜 안 되는지와 무엇을 올리면 되는지 알려준다", () => {
  expect(validateFiles([file("setup.EXE")])).toContain("실행 파일");
  expect(validateFiles([file("setup.EXE")])).toContain("이미지·문서·압축파일");
});

test("10MB를 넘는 파일은 줄여 달라고 알려준다", () => {
  expect(validateFiles([file("큰파일.png", MAX_FILE_BYTES + 1)])).toContain(
    "10MB 이하로 줄여 주세요.",
  );
});

test("빈 파일과 개수 초과도 거부한다", () => {
  expect(validateFiles([file("빈파일.txt", 0)])).toContain("빈 파일");
  expect(validateFiles(Array.from({ length: MAX_FILE_COUNT + 1 }, (_, i) => file(`${i}.png`)))).toContain(
    `최대 ${MAX_FILE_COUNT}개`,
  );
});

test("Storage 경로는 한글·공백·특수문자 없이 확장자를 유지한다", () => {
  const docs = [
    storageFileName("KSS코퍼레이션_기능정의서_수정1027.xlsx"),
    storageFileName("OK엔터씨_개인정보처리방침_2026_홈페이지게시용.docx"),
    storageFileName("보고서.hwp"),
    storageFileName("사진 1.png"),
  ];
  for (const name of docs) {
    expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(name).not.toContain("%");
  }
  expect(docs[0].endsWith(".xlsx")).toBe(true);
  expect(docs[1].endsWith(".docx")).toBe(true);
  expect(docs[2].endsWith(".hwp")).toBe(true);
  expect(docs[3].endsWith(".png")).toBe(true);
  expect(storageFileName("한글만")).toBe("file");
});

test("이미지 확장자만 미리보기로 표시하고 크기는 읽기 쉬운 단위로 적는다", () => {
  expect(isImageFileName("사진.JPEG")).toBe(true);
  expect(isImageFileName("보고서.hwp")).toBe(false);
  expect(formatFileSize(512)).toBe("512 B");
  expect(formatFileSize(2048)).toBe("2 KB");
  expect(formatFileSize(MAX_FILE_BYTES)).toBe("10.0 MB");
});
