import {
  monthlyByBranch,
  loadLedger,
  sheetFixedExpense,
  sheetOtherRevenue,
  type MonthlyBranchSummary,
  emptyMonthly,
} from "@/lib/ledger"
import { OPEN_BRANCHES, type Branch } from "@/lib/branches"
import { matchStatsByBranch, type BranchMatchStats } from "@/lib/matches"
import { dbRevenueByBranch, type DbRevenue } from "@/lib/revenue"
import { won, wonShort, pct, deltaLabel } from "@/lib/format"
import { currentYearMonth, previousMonth, monthsBack, yearOptions } from "@/lib/period"
import { YearSelector } from "./components/YearSelector"
import { MonthNumSelector } from "./components/MonthNumSelector"
import { DepreciationToggle } from "./components/DepreciationToggle"
import { ProgressHeatmap } from "./components/ProgressHeatmap"
import { progressHeatmap } from "@/lib/heatmap"
import { TrendChart, type TrendPoint } from "./components/TrendChart"

export const dynamic = "force-dynamic"
export const revalidate = 0

function branchTotal(
  sheet: MonthlyBranchSummary,
  db: DbRevenue,
  includeDep: boolean,
): {
  revenue: number
  expense: number
  depreciation: number
  managerCost: number
  profit: number
} {
  const revenue = db.socialRevenue + db.rentalRevenue + sheetOtherRevenue(sheet)
  const baseExpense = sheetFixedExpense(sheet)
  const depreciation = sheet.depreciation
  // 매니저비 우선순위: DB 실지급(2024-01~) > 시트 입력값(과거) > 기본가 추정
  const managerCost =
    db.managerCostActual > 0
      ? db.managerCostActual
      : sheet.expenseManager > 0
        ? sheet.expenseManager
        : db.managerCostEstimate
  const expense = baseExpense + (includeDep ? depreciation : 0)
  const profit = revenue - managerCost - expense
  return { revenue, expense, depreciation, managerCost, profit }
}

async function loadMonthMaps(year: number, month: number) {
  await loadLedger()
  const [list, matches, dbRev] = await Promise.all([
    monthlyByBranch(year, month),
    matchStatsByBranch(year, month),
    dbRevenueByBranch(year, month),
  ])
  const ledgerMap = new Map<number, MonthlyBranchSummary>()
  for (const s of list) ledgerMap.set(s.branch.groupId, s)
  return { ledgerMap, matches, dbRev }
}

async function loadTwelveMonthTrend(
  year: number,
  month: number,
  includeDep: boolean,
): Promise<TrendPoint[]> {
  const months = monthsBack(year, month, 12)
  return Promise.all(
    months.map(async (m) => {
      const { ledgerMap, matches, dbRev } = await loadMonthMaps(m.year, m.month)
      let revenue = 0
      let expense = 0
      let managerCost = 0
      const rates: number[] = []
      for (const b of OPEN_BRANCHES) {
        const sheet = ledgerMap.get(b.groupId) ?? emptyMonthly(b, m.year, m.month)
        const db = dbRev.get(b.groupId)!
        const t = branchTotal(sheet, db, includeDep)
        revenue += t.revenue
        expense += t.expense
        managerCost += t.managerCost
        const r = matches.get(b.groupId)?.progressRate
        if (r !== null && r !== undefined) rates.push(r)
      }
      const progressRate = rates.length > 0 ? rates.reduce((s, v) => s + v, 0) / rates.length : null
      return { ...m, revenue, expense: expense + managerCost, progressRate }
    }),
  )
}

type SearchParams = Promise<{ y?: string; m?: string; dep?: string }>

export default async function MonthlyDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const now = currentYearMonth()
  const defaultMonth = previousMonth(now.year, now.month)
  const year = sp.y ? Number(sp.y) : defaultMonth.year
  const month = sp.m ? Number(sp.m) : defaultMonth.month
  // 기본값: 감가상각 포함 · dep=0 파라미터일 때만 제외
  const includeDep = sp.dep !== "0"
  const prev = previousMonth(year, month)

  const [cur, prv, trend, heatmap] = await Promise.all([
    loadMonthMaps(year, month),
    loadMonthMaps(prev.year, prev.month),
    loadTwelveMonthTrend(year, month, includeDep),
    progressHeatmap(year, month),
  ])

  const rows: {
    branch: Branch
    match: BranchMatchStats | undefined
    revenue: number
    expense: number
    depreciation: number
    managerCost: number
    profit: number
    prevProfit: number
  }[] = OPEN_BRANCHES.map((b) => {
    const sheetCur = cur.ledgerMap.get(b.groupId) ?? emptyMonthly(b, year, month)
    const dbCur = cur.dbRev.get(b.groupId)!
    const sheetPrv = prv.ledgerMap.get(b.groupId) ?? emptyMonthly(b, prev.year, prev.month)
    const dbPrv = prv.dbRev.get(b.groupId)!
    const curTotal = branchTotal(sheetCur, dbCur, includeDep)
    const prvTotal = branchTotal(sheetPrv, dbPrv, includeDep)
    return {
      branch: b,
      match: cur.matches.get(b.groupId),
      ...curTotal,
      prevProfit: prvTotal.profit,
    }
  })

  const totalRev = rows.reduce((s, r) => s + r.revenue, 0)
  const totalMgr = rows.reduce((s, r) => s + r.managerCost, 0)
  const totalExp = rows.reduce((s, r) => s + r.expense, 0)
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0)
  const avgProgress = (() => {
    const rates = rows
      .map((r) => r.match?.progressRate)
      .filter((v): v is number => v !== null && v !== undefined)
    if (rates.length === 0) return null
    return rates.reduce((s, v) => s + v, 0) / rates.length
  })()

  const prevRev = trend.length >= 2 ? trend[trend.length - 2].revenue : 0
  const prevExp = trend.length >= 2 ? trend[trend.length - 2].expense : 0
  const prevProgress = trend.length >= 2 ? trend[trend.length - 2].progressRate : null
  const revDelta = deltaLabel(totalRev, prevRev)
  const expDelta = deltaLabel(totalExp + totalMgr, prevExp)
  const progressDeltaLabel = (() => {
    if (avgProgress === null || prevProgress === null) return { text: "—", tone: "neutral" as const }
    const diff = avgProgress - prevProgress
    const abs = Math.abs(diff * 100)
    if (diff > 0) return { text: `▲ ${abs.toFixed(1)}%p`, tone: "success" as const }
    if (diff < 0) return { text: `▼ ${abs.toFixed(1)}%p`, tone: "danger" as const }
    return { text: `— 0%p`, tone: "neutral" as const }
  })()

  return (
    <div className="max-w-6xl space-y-8">
      <header className="flex items-end justify-between border-b border-neutral-200 pb-3">
        <div>
          <h1 className="text-lg font-semibold">플랩 직영구장 지표</h1>
          <p className="text-xs text-neutral-500">
            {year}년 {month}월 · 영업 중 {OPEN_BRANCHES.length}개 지점
          </p>
        </div>
        <div className="flex gap-2">
          <DepreciationToggle exclude={!includeDep} />
          <YearSelector year={year} years={yearOptions()} />
          <MonthNumSelector month={month} />
        </div>
      </header>

      <section className="grid grid-cols-4 gap-3">
        <Kpi label="총 매출" value={won(totalRev)} sub={`전월 대비 ${revDelta.text}`} tone={revDelta.tone} />
        <Kpi
          label="총 지출"
          value={won(totalExp + totalMgr)}
          sub={
            includeDep
              ? `운영비 ${wonShort(totalExp - rows.reduce((s, r) => s + r.depreciation, 0))} + 매니저 ${wonShort(totalMgr)} + 감가 ${wonShort(rows.reduce((s, r) => s + r.depreciation, 0))}`
              : `운영비 ${wonShort(totalExp)} + 매니저 ${wonShort(totalMgr)}`
          }
          tone={expDelta.tone}
        />
        <Kpi
          label="영업이익"
          value={won(totalProfit)}
          sub={totalRev > 0 ? `이익률 ${pct(totalProfit / totalRev)}` : ""}
          tone={totalProfit >= 0 ? "success" : "danger"}
        />
        <Kpi
          label="평균 진행률"
          value={avgProgress !== null ? pct(avgProgress) : "—"}
          sub={`전월 대비 ${progressDeltaLabel.text}`}
          tone={progressDeltaLabel.tone}
        />
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-xs text-neutral-500">지점별 (클릭 시 지점 상세)</div>
          <div className="text-[10px] text-neutral-400">
            매출·매니저비 = DB · 자판기·지출·감가상각 = 시트
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm tabular">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-2 py-2 text-left font-normal">지점</th>
                <th className="px-2 py-2 text-right font-normal">세팅</th>
                <th className="px-2 py-2 text-right font-normal">진행</th>
                <th className="px-2 py-2 text-right font-normal">취소</th>
                <th className="px-2 py-2 text-right font-normal">진행률</th>
                <th className="px-2 py-2 text-right font-normal">매출</th>
                <th className="px-2 py-2 text-right font-normal">매니저비</th>
                <th className="px-2 py-2 text-right font-normal">지출</th>
                <th className="px-2 py-2 text-right font-normal">영업이익</th>
                <th className="px-2 py-2 text-right font-normal">전월대비</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = deltaLabel(r.profit, r.prevProfit)
                const m = r.match
                return (
                  <tr key={r.branch.groupId} className="border-t border-neutral-100">
                    <td className="px-2 py-2.5 whitespace-nowrap">{r.branch.displayName}</td>
                    <td className="px-2 py-2.5 text-right">{m?.setup ? m.setup : "—"}</td>
                    <td className="px-2 py-2.5 text-right">{m?.release ?? "—"}</td>
                    <td className={`px-2 py-2.5 text-right ${m && m.cancel > 0 ? "text-red-600" : ""}`}>
                      {m?.cancel ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {m?.progressRate !== null && m?.progressRate !== undefined
                        ? pct(m.progressRate)
                        : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right">{wonShort(r.revenue)}</td>
                    <td className="px-2 py-2.5 text-right">{wonShort(r.managerCost)}</td>
                    <td className="px-2 py-2.5 text-right">{wonShort(r.expense)}</td>
                    <td className={`px-2 py-2.5 text-right ${r.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {wonShort(r.profit)}
                    </td>
                    <td
                      className={`px-2 py-2.5 text-right ${delta.tone === "success" ? "text-emerald-600" : delta.tone === "danger" ? "text-red-600" : "text-neutral-500"}`}
                    >
                      {delta.text}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 text-xs text-neutral-500">12개월 매출·지출 추이 + 진행률 (전체 합계)</div>
        <TrendChart data={trend} />
      </section>

      <section>
        <div className="mb-2 text-xs text-neutral-500">
          요일 × 시간대 진행률 히트맵 ({year}년 {month}월 · 영업 지점 합계)
        </div>
        <ProgressHeatmap cells={heatmap} />
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: "success" | "danger" | "neutral"
}) {
  const toneClass = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-neutral-500"
  return (
    <div className="rounded-lg bg-neutral-50 px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular">{value}</div>
      {sub && <div className={`mt-0.5 text-[10px] ${toneClass}`}>{sub}</div>}
    </div>
  )
}
