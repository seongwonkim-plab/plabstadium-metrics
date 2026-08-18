"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const from = sp.get("from") ?? "/"

  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, from }),
      })
      const json = (await res.json()) as { ok: boolean; from?: string; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? "로그인에 실패했습니다.")
        return
      }
      router.replace(json.from ?? "/")
      router.refresh()
    } catch {
      setError("네트워크 오류입니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="text-center">
          <div className="text-base font-semibold">플랩 직영구장 지표</div>
          <div className="mt-1 text-xs text-neutral-500">운영파트 대시보드 · 로그인 필요</div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium text-neutral-600"
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {loading ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  )
}
