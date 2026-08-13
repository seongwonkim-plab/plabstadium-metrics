import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const PLAB_API_URL =
  process.env.PLAB_API_URL || "https://data-gateway.preview.plabfootball.com"
const PLAB_API_KEY = process.env.PLAB_API_KEY || ""

export async function GET() {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    // plabQuery의 5분 캐시를 우회해야 실시간 상태가 나오므로 직접 fetch 사용
    const response = await fetch(`${PLAB_API_URL}/api/query`, {
      method: "POST",
      headers: {
        "X-API-Key": PLAB_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "SELECT 1 AS ping" }),
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const latency = Date.now() - startedAt

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "")
      return NextResponse.json({
        status: "error",
        httpStatus: response.status,
        latency,
        message:
          response.status === 503
            ? "Plab API 서버 다운 (503)"
            : response.status === 429
              ? "요청 초과 (429)"
              : `HTTP ${response.status}`,
        detail: bodyText.slice(0, 200),
        checkedAt: new Date().toISOString(),
      })
    }

    const json = (await response.json().catch(() => null)) as {
      success?: boolean
      error?: string
    } | null
    if (!json?.success) {
      return NextResponse.json({
        status: "error",
        latency,
        message: "쿼리 실패",
        detail: json?.error ?? "unknown",
        checkedAt: new Date().toISOString(),
      })
    }
    return NextResponse.json({
      status: "ok",
      latency,
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    clearTimeout(timeoutId)
    const latency = Date.now() - startedAt
    const err = e as Error
    const isAbort = err.name === "AbortError"
    return NextResponse.json({
      status: "error",
      latency,
      message: isAbort ? "응답 시간 초과 (8초)" : "연결 실패",
      detail: err.message?.slice(0, 200),
      checkedAt: new Date().toISOString(),
    })
  }
}
