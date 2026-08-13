"use client"

import { useEffect, useState } from "react"

type Health = {
  status: "checking" | "ok" | "error"
  latency?: number
  httpStatus?: number
  message?: string
  detail?: string
  checkedAt?: string
}

const REFRESH_MS = 30_000

export function StatusIndicator() {
  const [health, setHealth] = useState<Health>({ status: "checking" })

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" })
        const json = (await res.json()) as Health
        if (!cancelled) setHealth(json)
      } catch {
        if (!cancelled)
          setHealth({
            status: "error",
            message: "요청 실패",
            checkedAt: new Date().toISOString(),
          })
      }
    }
    check()
    const timer = setInterval(check, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const isOk = health.status === "ok"
  const isChecking = health.status === "checking"
  const dot = isOk
    ? "bg-emerald-500"
    : isChecking
      ? "bg-neutral-300 animate-pulse"
      : "bg-red-500"
  const label = isOk ? "API 정상" : isChecking ? "확인 중" : "API 오류"
  const detail = isOk
    ? `응답 ${health.latency}ms`
    : isChecking
      ? "잠시만요..."
      : (health.message ?? "연결 실패")

  const checkedLabel = health.checkedAt
    ? new Date(health.checkedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—"

  const tooltip = [
    label,
    detail,
    health.httpStatus ? `HTTP ${health.httpStatus}` : null,
    health.detail ? `상세: ${health.detail}` : null,
    `최근 확인: ${checkedLabel}`,
  ]
    .filter(Boolean)
    .join("\n")

  return (
    <div
      className="flex items-start gap-2 rounded-md p-2 text-xs hover:bg-neutral-50"
      title={tooltip}
    >
      <span
        className={`mt-[5px] inline-block h-2 w-2 rounded-full ${dot}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${isOk ? "text-neutral-800" : isChecking ? "text-neutral-500" : "text-red-600"}`}>
          {label}
        </div>
        <div className="truncate text-neutral-500">{detail}</div>
        <div className="text-[10px] text-neutral-400">확인 {checkedLabel}</div>
      </div>
    </div>
  )
}
