import { listFrozen, FREEZE_CUTOFF_MONTHS } from "@/lib/frozen"
import { currentYearMonth, previousMonth, DATA_START_YEAR } from "@/lib/period"
import { RefreezeButton } from "./RefreezeButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

// 2020-01 ~ 3개월 전까지 모든 월 목록
function allTargetMonths(): { year: number; month: number }[] {
  const now = currentYearMonth()
  let cutoff = now
  for (let i = 0; i < FREEZE_CUTOFF_MONTHS; i++) {
    cutoff = previousMonth(cutoff.year, cutoff.month)
  }
  const out: { year: number; month: number }[] = []
  for (let y = DATA_START_YEAR; y <= cutoff.year; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === cutoff.year && m > cutoff.month) break
      out.push({ year: y, month: m })
    }
  }
  return out.reverse() // 최근 것부터
}

function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

function formatKst(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
  } catch {
    return iso
  }
}

export default async function AdminFreezePage() {
  const targets = allTargetMonths()
  const frozen = await listFrozen()
  const frozenMap = new Map(frozen.map((f) => [f.ym, f]))

  const frozenCount = targets.filter((t) => frozenMap.has(ymKey(t.year, t.month))).length
  const missingCount = targets.length - frozenCount
  const totalSize = frozen.reduce((s, f) => s + f.sizeBytes, 0)

  return (
    <div className="max-w-4xl space-y-6">
      <header className="border-b border-neutral-200 pb-3">
        <h1 className="text-lg font-semibold">Freeze 관리</h1>
        <p className="mt-1 text-xs text-neutral-500">
          {FREEZE_CUTOFF_MONTHS}개월 이전 월 데이터를 JSON 스냅샷으로 저장 · 자동 매월 1일 새벽 갱신
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-neutral-50 px-4 py-3">
          <div className="text-xs text-neutral-500">저장된 월</div>
          <div className="mt-0.5 text-lg font-semibold tabular">
            {frozenCount} / {targets.length}
          </div>
        </div>
        <div className="rounded-lg bg-neutral-50 px-4 py-3">
          <div className="text-xs text-neutral-500">미저장 (backfill 필요)</div>
          <div className={`mt-0.5 text-lg font-semibold tabular ${missingCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {missingCount}
          </div>
        </div>
        <div className="rounded-lg bg-neutral-50 px-4 py-3">
          <div className="text-xs text-neutral-500">총 파일 크기</div>
          <div className="mt-0.5 text-lg font-semibold tabular">{formatBytes(totalSize)}</div>
        </div>
      </section>

      {missingCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {missingCount}개월이 아직 저장되지 않았습니다. 로컬 CLI 에서{" "}
          <code className="rounded bg-amber-100 px-1">npm run freeze:backfill</code> 실행 시 일괄 저장됩니다.
        </div>
      )}

      <section>
        <div className="mb-2 text-xs text-neutral-500">월별 상태</div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm tabular">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-normal">월</th>
                <th className="px-3 py-2 text-left font-normal">상태</th>
                <th className="px-3 py-2 text-left font-normal">Frozen 시각</th>
                <th className="px-3 py-2 text-right font-normal">크기</th>
                <th className="px-3 py-2 text-right font-normal">작업</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => {
                const key = ymKey(t.year, t.month)
                const f = frozenMap.get(key)
                return (
                  <tr key={key} className="border-t border-neutral-100">
                    <td className="px-3 py-2.5">
                      {t.year}년 {t.month}월
                    </td>
                    <td className="px-3 py-2.5">
                      {f ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          저장됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                          미저장
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-neutral-500">
                      {f ? formatKst(f.frozenAt) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-neutral-500">
                      {f ? formatBytes(f.sizeBytes) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <RefreezeButton year={t.year} month={t.month} exists={!!f} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
