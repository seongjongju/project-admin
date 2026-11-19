/**
 * Supabase 공개 설정. 값이 없어도 앱이 죽지 않도록 화면에서 먼저 확인한다.
 * 공개 키(anon / publishable)만 쓴다. service_role / secret 키는 쓰지 않는다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function hasSupabaseConfig() {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
}

export const CONFIG_ERROR =
  "Supabase 설정이 없어 로그인할 수 없어요. .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 채운 뒤 서버를 다시 시작해 주세요.";
