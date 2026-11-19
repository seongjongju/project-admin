import LoginForm from "@/components/auth/LoginForm";
import { CONFIG_ERROR, hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "로그인 | 프로젝트 기록장" };

/** 로그인 여부 확인은 proxy가 먼저 처리한다. */
export default function LoginPage() {
  const configured = hasSupabaseConfig();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px]">
        <h1 className="text-center text-brand font-medium">프로젝트 기록장</h1>

        {configured ? (
          <LoginForm />
        ) : (
          <p role="alert" className="mt-8 border border-line p-4 text-ui break-words text-danger">
            {CONFIG_ERROR}
          </p>
        )}
      </div>
    </main>
  );
}
