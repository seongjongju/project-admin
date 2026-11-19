import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/**
 * 브라우저용 클라이언트. 세션은 쿠키에 저장돼 서버 컴포넌트도 같은 세션을 읽는다.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
