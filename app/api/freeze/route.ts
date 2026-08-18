import { NextResponse, type NextRequest } from "next/server"
import { freezeMonth } from "@/lib/freeze-job"
import { currentYearMonth, previousMonth } from "@/lib/period"
import { FREEZE_CUTOFF_MONTHS } from "@/lib/frozen"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Bearer 토큰 인증 (Vercel Cron 및 수동 CLI 트리거).
// 인증 미들웨어를 없앤 뒤 이 라우트만 secret 로 보호.
function checkAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get("authorization") === `Bearer ${secret}`
}

// GET: Vercel Cron 이 매월 1일 호출. body 없이 자동 대상월 결정.
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  // 대상: FREEZE_CUTOFF_MONTHS 개월 전
  const now = currentYearMonth()
  let target = now
  for (let i = 0; i < FREEZE_CUTOFF_MONTHS; i++) {
    target = previousMonth(target.year, target.month)
  }
  try {
    const data = await freezeMonth(target.year, target.month)
    return NextResponse.json({
      ok: true,
      yearMonth: data.yearMonth,
      frozenAt: data.frozenAt,
      branchCount: Object.keys(data.byBranch).length,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    )
  }
}

// POST: 수동 재freeze. Bearer 필요.
// body: { year, month }
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  let body: { year?: number; month?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  }
  const year = Number(body.year)
  const month = Number(body.month)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ ok: false, error: "year, month 필수" }, { status: 400 })
  }
  try {
    const data = await freezeMonth(year, month)
    return NextResponse.json({
      ok: true,
      yearMonth: data.yearMonth,
      frozenAt: data.frozenAt,
      branchCount: Object.keys(data.byBranch).length,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    )
  }
}
