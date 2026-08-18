"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    // 클라이언트 사이드 signIn: next-auth/react 가 CSRF 처리 + Google 로 window.location 이동
    await signIn("google", { callbackUrl })
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
