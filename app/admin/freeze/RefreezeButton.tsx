"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function RefreezeButton({
  year,
  month,
  exists,
}: {
  year: number
  month: number
  exists: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      })
      const json = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? "실패")
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "..." : exists ? "재저장" : "저장"}
      </button>
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  )
}
