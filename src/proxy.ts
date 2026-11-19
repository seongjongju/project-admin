import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, hasSupabaseConfig } from "@/lib/supabase/config";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Next.js 16은 middleware 대신 proxy.ts를 쓴다.
 * - 만료된 세션 토큰을 갱신해 쿠키에 다시 쓴다.
 * - 로그인하지 않았으면 /login으로, 로그인했는데 /login이면 홈으로 보낸다.
 * 화면을 그리기 전에 서버에서 판단하므로 보호 화면이 잠깐 보이는 깜빡임이 없다.
 */
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSupabaseConfig()) {
    return isLogin ? NextResponse.next({ request }) : redirectTo(request, "/login");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  // getClaims는 서명을 검증한다. getSession처럼 쿠키 값을 그대로 믿지 않는다.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  if (loggedIn === isLogin) {
    // 갱신된 세션 쿠키와 캐시 헤더를 리다이렉트 응답에도 옮긴다.
    const target = redirectTo(request, isLogin ? "/" : "/login");
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    ["cache-control", "expires", "pragma"].forEach((header) => {
      const value = response.headers.get(header);
      if (value) target.headers.set(header, value);
    });
    return target;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
