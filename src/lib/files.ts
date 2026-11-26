/** 파일 첨부 규칙. 화면과 업로드가 같은 기준을 쓰도록 한 곳에 둔다. */

export const MAX_FILE_COUNT = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".msi",
  ".sh",
  ".ps1",
  ".vbs",
  ".scr",
  ".com",
  ".app",
]);

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
  ".svg",
]);

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

export function isImageFileName(name: string) {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}

/**
 * Storage 객체명은 Supabase가 S3 안전 문자(ASCII)만 허용한다.
 * 한글·공백·% 등은 저장 경로에서만 바꾸고, 원본 파일명은 DB에 그대로 둔다.
 */
export function storageFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot).replace(/[^A-Za-z0-9.]/g, "") : "";
  const base = name
    .slice(0, dot > 0 ? dot : name.length)
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "");
  return `${base || "file"}${extension}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 잘못된 파일이면 왜 안 되는지와 어떻게 고치면 되는지 돌려준다. */
export function validateFiles(files: File[]): string {
  if (files.length > MAX_FILE_COUNT) {
    return `파일은 최대 ${MAX_FILE_COUNT}개까지 첨부할 수 있습니다. 필요 없는 파일을 빼 주세요.`;
  }
  for (const file of files) {
    if (!file.name.trim()) {
      return "이름이 없는 파일은 첨부할 수 없습니다. 파일명을 확인해 주세요.";
    }
    if (BLOCKED_EXTENSIONS.has(extensionOf(file.name))) {
      return `"${file.name}"은(는) 실행 파일이라 첨부할 수 없습니다. 이미지·문서·압축파일을 올려 주세요.`;
    }
    if (file.size === 0) {
      return `"${file.name}"은(는) 빈 파일입니다. 내용이 있는 파일을 선택해 주세요.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `"${file.name}"이(가) 10MB를 넘습니다. 10MB 이하로 줄여 주세요.`;
    }
  }
  return "";
}
