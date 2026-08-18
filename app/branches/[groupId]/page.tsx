import { notFound } from "next/navigation"
import { OPEN_BRANCHES, BRANCHES, branchByGroupId } from "@/lib/branches"
import {
  monthlyByBranch,
  sheetFixedExpense,
  sheetOtherRevenue,
  emptyMonthly,
  type MonthlyBranchSummary,
} from "@/lib/ledger"
import type { DbRevenue } from "@/lib/revenue"
import { loadBranchInfo, matchStatsByStadium } from "@/lib/branch-detail"
import { won, wonShort, pct } from "@/lib/format"
import { currentYearMonth, previousMonth, monthsBack, yearOptions } from "@/lib/period"
import { BranchSwitcher } from "./BranchSwitcher"
import { DepreciationToggle } from "@/app/components/DepreciationToggle"
import { YearSelector } from "@/app/components/YearSelector"
import { MonthNumSelector } from "@/app/components/MonthNumSelector"
import { ProgressHeatmap } from "@/app/components/ProgressHeatmap"
import { TrendChart, type TrendPoint } from "@/app/components/TrendChart"
import { loadMonths, loadStadiumHeatmaps } from "@/lib/hybrid"
import { ymKey } from "@/lib/frozen"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const maxDuration = 60

type Params = Promise<{ groupId: string }>
type SearchParams = Promise<{ dep?: string; y?: string; m?: string }>

function branchTotal(sheet: MonthlyBranchSummary, db: DbRevenue, includeDep: boolean) {
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
  const expenseWithMgr = baseExpense + managerCost + (includeDep ? depreciation : 0)
  const profit = revenue - expenseWithMgr
  return {
    revenue,
    baseExpense,
    depreciation,
    managerCost,
    expenseWithMgr,
    profit,
  }
}

export default async function BranchDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const [p, sp] = await Promise.all([params, searchParams])
  const groupId = Number(p.groupId)
  const branch = branchByGroupId(groupId)
  if (!branch) notFound()

  const includeDep = sp.dep !== "0"
  const now = currentYearMonth()
  const defaultMonth = previousMonth(now.year, now.month)
  const year = sp.y ? Number(sp.y) : defaultMonth.year
  const month = sp.m ? Number(sp.m) : defaultMonth.month

  // 12개월 트렌드 (hybrid: frozen + live)
  const trendMonths = monthsBack(year, month, 12)

  const [info, monthData, stadiumStats, stadiumHeatmaps, ledgerList] = await Promise.all([
    loadBranchInfo(groupId),
    loadMonths(trendMonths),
    matchStatsByStadium(groupId, year, month),
    loadStadiumHeatmaps(groupId, year, month),
    monthlyByBranch(year, month),
  ])

  const summary: MonthlyBranchSummary =
    ledgerList.find((s) => s.branch.groupId === groupId) ??
    emptyMonthly(branch, year, month)
  const curKey = ymKey(year, month)
  const curMd = monthData.get(curKey)
  const db: DbRevenue = curMd?.dbRev.get(groupId) ?? {
    groupId,
    socialRevenue: 0,
    rentalRevenue: 0,
    managerCost: 0,
    managerCostActual: 0,
    managerCostEstimate: 0,
    releaseMatchCount: 0,
  }
  const match = curMd?.match.get(groupId) ?? {
    groupId,
    setup: 0,
    release: 0,
    cancel: 0,
    progressRate: null,
    socialRevenue: 0,
  }
  const t = branchTotal(summary, db, includeDep)

  // 12개월 트렌드 데이터 (지점 단위)
  const sheetsPerMonth = await Promise.all(
    trendMonths.map((m) => monthlyByBranch(m.year, m.month)),
  )
  const sheetByYm = new Map<string, MonthlyBranchSummary | undefined>()
  trendMonths.forEach((m, i) => {
    sheetByYm.set(ymKey(m.year, m.month), sheetsPerMonth[i].find((x) => x.branch.groupId === groupId))
  })
  const trend: TrendPoint[] = trendMonths.map((m) => {
    const key = ymKey(m.year, m.month)
    const sheet = sheetByYm.get(key) ?? emptyMonthly(branch, m.year, m.month)
    const md = monthData.get(key)
    const dbM = md?.dbRev.get(groupId) ?? {
      groupId,
      socialRevenue: 0,
      rentalRevenue: 0,
      managerCost: 0,
      managerCostActual: 0,
      managerCostEstimate: 0,
      releaseMatchCount: 0,
    }
    const bt = branchTotal(sheet, dbM, includeDep)
    const rate = md?.match.get(groupId)?.progressRate ?? null
    return { ...m, revenue: bt.revenue, expense: bt.expenseWithMgr, progressRate: rate }
  })
  const frozenCount = Array.from(monthData.values()).filter((v) => v.source === "frozen").length
  const liveCount = monthData.size - frozenCount

  const openStadiums = info.stadiums.filter((s) => s.isOpen).length
  const openLabel = info.openDate
    ? new Date(info.openDate).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
      })
    : "—"

  const activeBranches = BRANCHES.filter((b) => b.status !== "closed").map((b) => ({
    groupId: b.groupId,
    label: b.status === "paused" ? `${b.displayName} (휴점)` : b.displayName,
  }))

  const totalStadiumRev = stadiumStats.reduce((s, x) => s + x.revenue, 0)

  return (
    <div className="max-w-6xl space-y-8">
      <header className="flex items-end justify-between border-b border-neutral-200 pb-3">
        <div>
          <h1 className="text-lg font-semibold">{branch.displayName}</h1>
          <p className="text-xs text-neutral-500">
            {openLabel} 오픈 · {openStadiums}개 구장 운영
          </p>
        </div>
        <div className="flex gap-2">
          <DepreciationToggle exclude={!includeDep} />
          <BranchSwitcher current={groupId} options={activeBranches} />
          <YearSelector year={year} years={yearOptions()} />
          <MonthNumSelector month={month} />
        </div>
      </header>

      <section className="grid grid-cols-4 gap-3">
        <Kpi label="매출" value={won(t.revenue)} />
        <Kpi
          label="지출"
          value={won(t.expenseWithMgr)}
          sub={
            includeDep
              ? `운영비 ${wonShort(t.baseExpense)} + 매니저 ${wonShort(t.managerCost)} + 감가 ${wonShort(t.depreciation)}`
              : `운영비 ${wonShort(t.baseExpense)} + 매니저 ${wonShort(t.managerCost)}`
          }
        />
        <Kpi
          label="영업이익"
          value={won(t.profit)}
          tone={t.profit >= 0 ? "success" : "danger"}
          sub={t.revenue > 0 ? `이익률 ${pct(t.profit / t.revenue)}` : ""}
        />
        <Kpi
          label="진행률"
          value={
            match?.progressRate !== null && match?.progressRate !== undefined
              ? pct(match.progressRate)
              : "—"
          }
          sub={match ? `세팅 ${match.setup}건` : ""}
        />
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-xs text-neutral-500">
            12개월 매출·지출 추이 + 진행률 ({branch.displayName})
          </div>
          <div className="text-[10px] text-neutral-400">
            {frozenCount > 0 && `${frozenCount}개월 캐시 · `}
            {liveCount > 0 && `${liveCount}개월 실시간`}
          </div>
        </div>
        <TrendChart data={trend} />
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-xs text-neutral-500">구장별 이번 달 실적</div>
          <div className="text-[10px] text-neutral-400">
            매출 = DB 소셜 (구장 단위)
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm tabular">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-normal">구장</th>
                <th className="px-3 py-2 text-right font-normal">매치 세팅</th>
                <th className="px-3 py-2 text-right font-normal">진행</th>
                <th className="px-3 py-2 text-right font-normal">취소</th>
                <th className="px-3 py-2 text-right font-normal">진행률</th>
                <th className="px-3 py-2 text-right font-normal">소셜 매출</th>
              </tr>
            </thead>
            <tbody>
              {stadiumStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-neutral-400">
                    이번 달 매치 데이터 없음
                  </td>
                </tr>
              ) : (
                <>
                  {stadiumStats.map((s) => (
                    <tr key={s.stadiumId} className="border-t border-neutral-100">
                      <td className="px-3 py-2.5">
                        {branch.displayName} {s.name}
                      </td>
                      <td className="px-3 py-2.5 text-right">{s.setup}</td>
                      <td className="px-3 py-2.5 text-right">{s.release}</td>
                      <td className={`px-3 py-2.5 text-right ${s.cancel > 0 ? "text-red-600" : ""}`}>
                        {s.cancel}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {s.progressRate !== null ? pct(s.progressRate) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">{won(s.revenue)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-neutral-200 bg-neutral-50 text-neutral-500">
                    <td className="px-3 py-2.5 text-xs">구장 합계 (참고)</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="px-3 py-2.5 text-right text-xs">{won(totalStadiumRev)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 text-xs text-neutral-500">이번 달 손익 상세</div>
        <div className="rounded-lg bg-neutral-50 p-4 text-sm tabular">
          <div className="mb-1.5 text-xs text-neutral-500">매출</div>
          <Row label="소셜 매출 (DB)" value={won(db.socialRevenue)} />
          <Row label="대관 매출 (DB)" value={won(db.rentalRevenue)} />
          <Row label="자판기 매출 (시트)" value={won(summary.revenueVending)} />
          {summary.revenueAcademy > 0 && (
            <Row label="아카데미 매출 (시트)" value={won(summary.revenueAcademy)} />
          )}
          {summary.revenueUnknown > 0 && (
            <Row
              label={`기타 매출 (${summary.unknownRevenues.map((u) => u.key).join(", ")})`}
              value={won(summary.revenueUnknown)}
              muted
            />
          )}
          <Row label="총 매출" value={won(t.revenue)} bold divider />

          <div className="mt-3 mb-1.5 text-xs text-neutral-500">지출</div>
          <Row label="매니저비 (DB · 인센 포함)" value={won(t.managerCost)} />
          <Row label="지급임차료" value={won(summary.expenseRent)} />
          <Row label="관리자 인건비 (용역비/인건비)" value={won(summary.expenseStaff)} />
          <Row label="수도광열비" value={won(summary.expenseUtility)} />
          <Row label="통신비" value={won(summary.expenseComm)} />
          <Row label="소모품비" value={won(summary.expenseSupplies)} />
          <Row label="보험" value={won(summary.expenseInsurance)} />
          <Row label="자판기 운영비" value={won(summary.expenseVending)} />
          <Row label="제세동기" value={won(summary.expenseAED)} />
          <Row label="지급수수료" value={won(summary.expenseFee)} />
          <Row label="매출원가 (자판기 음료 등)" value={won(summary.costOfSales)} />
          {summary.expenseUnknown > 0 && (
            <Row
              label={`기타 지출 (${summary.unknownExpenses.map((u) => u.key).join(", ")})`}
              value={won(summary.expenseUnknown)}
              muted
            />
          )}
          {includeDep && summary.depreciation > 0 && (
            <Row label="감가상각" value={won(summary.depreciation)} />
          )}
          <Row
            label={`총 지출 ${includeDep ? "(감가 포함)" : "(감가 제외)"}`}
            value={won(t.expenseWithMgr)}
            bold
            divider
          />

          <div className="mt-3 border-t border-neutral-300 pt-3">
            <div className="flex justify-between text-base font-semibold">
              <span>영업이익 {includeDep ? "(감가 포함)" : "(감가 제외)"}</span>
              <span className={t.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                {t.profit >= 0 ? "+ " : ""}
                {wonShort(t.profit)}원
              </span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 text-xs text-neutral-500">
          구장별 요일 × 시간대 진행률 히트맵 ({year}년 {month}월)
        </div>
        {stadiumHeatmaps.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 p-6 text-center text-xs text-neutral-400">
            이번 달 매치 데이터 없음
          </div>
        ) : (
          <div className="space-y-4">
            {stadiumHeatmaps.map((sh) => (
              <div key={sh.stadiumId}>
                <div className="mb-1 text-[11px] font-medium text-neutral-700">
                  {branch.displayName} {sh.name}
                </div>
                <ProgressHeatmap cells={sh.cells} />
              </div>
            ))}
          </div>
        )}
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
  tone?: "success" | "danger"
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

function Row({
  label,
  value,
  bold,
  muted,
  divider,
}: {
  label: string
  value: string
  bold?: boolean
  muted?: boolean
  divider?: boolean
}) {
  return (
    <div
      className={`flex justify-between py-1 ${muted ? "text-neutral-500" : ""} ${bold ? "font-medium" : ""} ${divider ? "border-t border-neutral-200 mt-1 pt-1.5" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
