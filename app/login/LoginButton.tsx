"use client"

import { useState } from "react"

// next-auth/react 의 signIn 은 fetch 로 처리하면서 CSRF 쿠키·리다이렉트 처리에
// 버그가 있어서 (v5 beta 이슈) 브라우저 네이티브 form submit 으로 우회.
export function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      // 1) CSRF 토큰 조회 (쿠키도 함께 설정됨)
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" })
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

      // 2) 네이티브 form POST → 브라우저가 302 리다이렉트를 Google 로 따라감
      const form = document.createElement("form")
      form.method = "POST"
      form.action = "/api/auth/signin/google"

      const csrfInput = document.createElement("input")
      csrfInput.type = "hidden"
      csrfInput.name = "csrfToken"
      csrfInput.value = csrfToken
      form.appendChild(csrfInput)

      const cbInput = document.createElement("input")
      cbInput.type = "hidden"
      cbInput.name = "callbackUrl"
      cbInput.value = callbackUrl
      form.appendChild(cbInput)

      document.body.appendChild(form)
      form.submit()
    } catch (e) {
      console.error("signIn 실패:", e)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8.05 6.25C12.55 13.1 17.8 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24.5c0-1.6-.14-3.13-.4-4.6H24v9.15h12.6c-.55 2.85-2.15 5.25-4.55 6.85l7.05 5.45c4.1-3.8 6.4-9.4 6.4-15.85z"
        />
        <path
          fill="#FBBC05"
          d="M10.65 28.5A14.5 14.5 0 019.5 24c0-1.55.27-3.05.75-4.45L2.2 13.2A24 24 0 000 24c0 3.85.9 7.5 2.5 10.75l8.15-6.25z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.4 0 11.8-2.1 15.7-5.75l-7.05-5.45c-2 1.35-4.55 2.15-8.65 2.15-6.2 0-11.45-3.6-13.35-8.95L2.5 34.75C6.4 42.6 14.6 48 24 48z"
        />
      </svg>
      {loading ? "이동 중..." : "Google 로 로그인"}
    </button>
  )
}
