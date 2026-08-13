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
  const managerCost = db.managerCost
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

type TrendPoint = {
  year: number
  month: number
  revenue: number
  expense: number
  progressRate: number | null
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

  const [cur, prv, trend] = await Promise.all([
    loadMonthMaps(year, month),
    loadMonthMaps(prev.year, prev.month),
    loadTwelveMonthTrend(year, month, includeDep),
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
    </div>
  )
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const chartMax = Math.max(1, ...data.flatMap((m) => [m.revenue, m.expense]))
  const chartH = 180  // 막대 영역 픽셀 높이
  const width = 720
  const leftPad = 8
  const rightPad = 8
  const usableW = width - leftPad - rightPad
  const slotW = usableW / data.length
  const barGroupW = slotW * 0.7
  const barGap = 3
  const barW = (barGroupW - barGap) / 2

  // 진행률 점: 0~1 → 상단 오버레이. 100%가 chart 상단 근처.
  const rateY = (rate: number | null) => {
    if (rate === null) return null
    return chartH * (1 - rate) + 8  // 상단 여백 8px
  }

  const points = data
    .map((m, i) => {
      const y = rateY(m.progressRate)
      if (y === null) return null
      const x = leftPad + slotW * (i + 0.5)
      return { x, y, rate: m.progressRate!, i }
    })
    .filter((p): p is { x: number; y: number; rate: number; i: number } => p !== null)

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${chartH + 40}`}
          width="100%"
          preserveAspectRatio="none"
          style={{ minWidth: "560px" }}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={leftPad}
              x2={width - rightPad}
              y1={chartH * (1 - f) + 8}
              y2={chartH * (1 - f) + 8}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}

          {data.map((m, i) => {
            const isLast = i === data.length - 1
            const cx = leftPad + slotW * (i + 0.5)
            const revH = (m.revenue / chartMax) * chartH
            const expH = (m.expense / chartMax) * chartH
            return (
              <g key={`${m.year}-${m.month}`}>
                <rect
                  x={cx - barGroupW / 2}
                  y={chartH - revH + 8}
                  width={barW}
                  height={revH}
                  fill={isLast ? "#1d4ed8" : "#60a5fa"}
                  rx={2}
                >
                  <title>매출 {won(m.revenue)}</title>
                </rect>
                <rect
                  x={cx - barGroupW / 2 + barW + barGap}
                  y={chartH - expH + 8}
                  width={barW}
                  height={expH}
                  fill={isLast ? "#4b5563" : "#9ca3af"}
                  rx={2}
                >
                  <title>지출 {won(m.expense)}</title>
                </rect>
                <text
                  x={cx}
                  y={chartH + 26}
                  fontSize={10}
                  fill={isLast ? "#111827" : "#6b7280"}
                  fontWeight={isLast ? 500 : 400}
                  textAnchor="middle"
                >
                  {m.month}월
                </text>
              </g>
            )
          })}

          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2}
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            />
          )}
          {points.map((p) => (
            <g key={`dot-${p.i}`}>
              <circle cx={p.x} cy={p.y} r={4} fill="#f59e0b">
                <title>진행률 {pct(p.rate)}</title>
              </circle>
              <text
                x={p.x}
                y={p.y - 8}
                fontSize={9}
                fill="#b45309"
                textAnchor="middle"
              >
                {(p.rate * 100).toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded bg-blue-400" /> 매출
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded bg-neutral-400" /> 지출
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> 진행률
        </span>
      </div>
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
