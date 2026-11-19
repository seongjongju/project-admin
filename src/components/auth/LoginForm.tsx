"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputBase } from "@/components/projects/formStyles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

/** 어떤 계정이 틀렸는지는 알려주지 않는다. */
function authErrorMessage(code: string | undefined, status: number | undefined) {
  if (code === "invalid_credentials") {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }
  if (code === "email_not_confirmed") {
    return "이메일 인증이 아직 끝나지 않았어요. 메일함을 확인해 주세요.";
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "시도 횟수가 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }
  return "연결에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

export default function LoginForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function validate() {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "이메일을 입력해 주세요.";
    else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "이메일 형식이 올바르지 않아요.";
    }
    if (!password) next.password = "비밀번호를 입력해 주세요.";

    setErrors(next);
    if (next.email) emailRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!validate() || pending) return;

    setPending(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError(authErrorMessage(error.code, error.status));
        setPending(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setFormError("연결에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="login-email" className="text-ui font-medium">
          이메일
        </label>
        <input
          ref={emailRef}
          id="login-email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={`${inputBase} mt-1.5`}
        />
        {errors.email && (
          <p id="login-email-error" className="mt-1.5 text-ui text-danger">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="login-password" className="text-ui font-medium">
          비밀번호
        </label>
        <input
          ref={passwordRef}
          id="login-password"
          type="password"
          name="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (errors.password) {
              setErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className={`${inputBase} mt-1.5`}
        />
        {errors.password && (
          <p id="login-password-error" className="mt-1.5 text-ui text-danger">
            {errors.password}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-ui text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[2px] bg-accent px-4 text-ui font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
