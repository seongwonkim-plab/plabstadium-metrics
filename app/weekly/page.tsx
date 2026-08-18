import { OPEN_BRANCHES } from "@/lib/branches"
import {
  currentWeek,
  weekKey,
  weekFromKey,
  weeksInYear,
  yearOptions,
} from "@/lib/period"
import { matchStatsByWeek } from "@/lib/matches"
import { won, pct } from "@/lib/format"
import { WeekSelector } from "./WeekSelector"
import { YearSelector } from "@/app/components/YearSelector"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const revalidate = 0

type SearchParams = Promise<{ w?: string; y?: string }>

export default async function WeeklyDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const requested = sp.w ? weekFromKey(sp.w) : null
  const cur = requested ?? currentWeek()
  const curStats = await matchStatsByWeek(cur.start, true)

  const selectedYear = sp.y ? Number(sp.y) : cur.year
  const options = weeksInYear(selectedYear)
    .reverse()
    .map((w) => ({ key: weekKey(w), label: w.label }))

  return (
    <div className="max-w-6xl space-y-8">
      <header className="flex items-end justify-between border-b border-neutral-200 pb-3">
        <div>
          <h1 className="text-lg font-semibold">주간 지점별 지표</h1>
          <p className="text-xs text-neutral-500">{cur.label}</p>
        </div>
        <div className="flex gap-2">
          <YearSelector year={selectedYear} years={yearOptions()} />
          <WeekSelector current={weekKey(cur)} options={options} />
        </div>
      </header>

      <section>
        <div className="mb-2 text-xs text-neutral-500">지점별</div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm tabular">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-normal">지점</th>
                <th className="px-3 py-2 text-right font-normal">매치 세팅</th>
                <th className="px-3 py-2 text-right font-normal">진행</th>
                <th className="px-3 py-2 text-right font-normal">취소</th>
                <th className="px-3 py-2 text-right font-normal">진행률</th>
                <th className="px-3 py-2 text-right font-normal">소셜 매출</th>
              </tr>
            </thead>
            <tbody>
              {OPEN_BRANCHES.map((b) => {
                const s = curStats.get(b.groupId)
                const isLowProgress = s && s.progressRate !== null && s.progressRate < 0.5
                const hasCancel = s && s.cancel > 0
                return (
                  <tr key={b.groupId} className="border-t border-neutral-100">
                    <td className="px-3 py-2.5">{b.displayName}</td>
                    <td className="px-3 py-2.5 text-right">{s?.setup ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right">{s?.release ?? "—"}</td>
                    <td className={`px-3 py-2.5 text-right ${hasCancel ? "text-red-600" : ""}`}>
                      {s?.cancel ?? "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right ${isLowProgress ? "text-red-600" : ""}`}>
                      {s?.progressRate !== null && s?.progressRate !== undefined
                        ? pct(s.progressRate)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {s?.socialRevenue !== undefined ? won(s.socialRevenue) : "—"}
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
