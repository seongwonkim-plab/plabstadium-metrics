import { readSheetRange } from "./sheets"
import { branchBySheetName, type Branch } from "./branches"
import {
  categoryFor,
  REVENUE_DETAIL,
  SERVICE_DETAIL,
  type AccountCategory,
} from "./accounts"

export type LedgerRow = {
  branch: Branch
  date: string
  year: number
  month: number
  accountTitle: string
  detail: string
  client: string
  sales: number
  expense: number
  category: AccountCategory | undefined
}

let cache: { rows: LedgerRow[]; ts: number } | null = null
const CACHE_TTL_MS = 60_000

function toNum(v: unknown): number {
  if (v === "" || v === null || v === undefined) return 0
  if (typeof v === "number") return v
  const n = Number(String(v).replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

function toInt(v: unknown): number {
  const n = toNum(v)
  return Math.trunc(n)
}

export async function loadLedger(force = false): Promise<LedgerRow[]> {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.rows
  }
  const raw = await readSheetRange("세부내역!A4:I")
  const rows: LedgerRow[] = []
  for (const r of raw) {
    const sheetName = String(r[0] ?? "").trim()
    if (!sheetName) continue
    const branch = branchBySheetName(sheetName)
    if (!branch) continue
    const accountTitle = String(r[2] ?? "").trim()
    if (!accountTitle) continue
    rows.push({
      branch,
      date: String(r[1] ?? ""),
      year: toInt(r[7]),
      month: toInt(r[8]),
      accountTitle,
      detail: String(r[3] ?? "").trim(),
      client: String(r[4] ?? "").trim(),
      sales: toNum(r[5]),
      expense: toNum(r[6]),
      category: categoryFor(accountTitle),
    })
  }
  cache = { rows, ts: Date.now() }
  return rows
}

export type UnknownEntry = { key: string; total: number; count: number }

export type MonthlyBranchSummary = {
  branch: Branch
  year: number
  month: number
  // 매출 (시트)
  revenueSocial: number
  revenueRental: number
  revenueVending: number
  revenueAcademy: number
  revenueUnknown: number
  costOfSales: number
  // 지출 (시트) — 각 계정과목 별도 필드
  expenseRent: number
  expenseStaff: number
  expenseManager: number
  expenseUtility: number
  expenseComm: number
  expenseSupplies: number
  expenseInsurance: number
  expenseVending: number
  expenseAED: number
  expenseFee: number
  expenseUnknown: number
  depreciation: number
  // 매핑 안 된 매출·지출 세부 목록
  unknownRevenues: UnknownEntry[]
  unknownExpenses: UnknownEntry[]
}

export function emptyMonthly(
  branch: Branch,
  year: number,
  month: number,
): MonthlyBranchSummary {
  return {
    branch,
    year,
    month,
    revenueSocial: 0,
    revenueRental: 0,
    revenueVending: 0,
    revenueAcademy: 0,
    revenueUnknown: 0,
    costOfSales: 0,
    expenseRent: 0,
    expenseStaff: 0,
    expenseManager: 0,
    expenseUtility: 0,
    expenseComm: 0,
    expenseSupplies: 0,
    expenseInsurance: 0,
    expenseVending: 0,
    expenseAED: 0,
    expenseFee: 0,
    expenseUnknown: 0,
    depreciation: 0,
    unknownRevenues: [],
    unknownExpenses: [],
  }
}

const REVENUE_DETAILS = new Set<string>(Object.values(REVENUE_DETAIL))
const EXPENSE_MAP: Record<string, keyof MonthlyBranchSummary> = {
  지급임차료: "expenseRent",
  수도광열비: "expenseUtility",
  통신비: "expenseComm",
  소모품비: "expenseSupplies",
  보험: "expenseInsurance",
  자판기: "expenseVending",
  제세동기: "expenseAED",
  지급수수료: "expenseFee",
}

function accumulate(target: MonthlyBranchSummary, row: LedgerRow): void {
  if (row.category === "revenue") {
    if (row.detail === REVENUE_DETAIL.SOCIAL) target.revenueSocial += row.sales
    else if (row.detail === REVENUE_DETAIL.RENTAL) target.revenueRental += row.sales
    else if (row.detail === REVENUE_DETAIL.VENDING) target.revenueVending += row.sales
    else if (row.detail === REVENUE_DETAIL.ACADEMY) target.revenueAcademy += row.sales
    else if (row.detail === "소셜") target.revenueSocial += row.sales
    else if (row.detail === "대관") target.revenueRental += row.sales
    else {
      target.revenueUnknown += row.sales
      addUnknown(target.unknownRevenues, row.detail || "(적요 없음)", row.sales)
      console.warn(
        `[ledger] 알 수 없는 매출 적요: "${row.detail}" (${row.branch.displayName} ${row.year}-${row.month})`,
      )
    }
    return
  }
  if (row.category === "cost_of_sales") {
    target.costOfSales += row.expense
    return
  }
  if (row.category === "depreciation") {
    target.depreciation += row.expense
    return
  }
  if (row.category !== "expense") {
    // 계정과목 자체가 매핑 안 됨
    if (row.expense > 0) {
      target.expenseUnknown += row.expense
      addUnknown(target.unknownExpenses, `${row.accountTitle}/${row.detail}`, row.expense)
      console.warn(
        `[ledger] 알 수 없는 계정과목: "${row.accountTitle}" (${row.branch.displayName} ${row.year}-${row.month})`,
      )
    }
    return
  }

  if (row.accountTitle === "용역비") {
    if (row.detail === SERVICE_DETAIL.MANAGER) target.expenseManager += row.expense
    else target.expenseStaff += row.expense
    return
  }
  const field = EXPENSE_MAP[row.accountTitle]
  if (field) {
    ;(target[field] as number) += row.expense
  } else {
    target.expenseUnknown += row.expense
    addUnknown(target.unknownExpenses, `${row.accountTitle}/${row.detail}`, row.expense)
    console.warn(
      `[ledger] 지출 매핑 없음: "${row.accountTitle}" (${row.branch.displayName} ${row.year}-${row.month})`,
    )
  }
}

function addUnknown(list: UnknownEntry[], key: string, amount: number): void {
  const found = list.find((x) => x.key === key)
  if (found) {
    found.total += amount
    found.count += 1
  } else {
    list.push({ key, total: amount, count: 1 })
  }
}

export async function monthlyByBranch(
  year: number,
  month: number,
): Promise<MonthlyBranchSummary[]> {
  const rows = await loadLedger()
  const byGroupId = new Map<number, MonthlyBranchSummary>()
  for (const row of rows) {
    if (row.year !== year || row.month !== month) continue
    const key = row.branch.groupId
    if (!byGroupId.has(key)) {
      byGroupId.set(key, emptyMonthly(row.branch, year, month))
    }
    accumulate(byGroupId.get(key)!, row)
  }
  return Array.from(byGroupId.values())
}

// 시트 매출 (소셜 제외, 자판기·아카데미·기타 매출)
export function sheetOtherRevenue(m: MonthlyBranchSummary): number {
  return m.revenueVending + m.revenueAcademy + m.revenueUnknown
}

// 시트 고정지출 (매니저비·감가상각 제외한 시트 지출 합계)
export function sheetFixedExpense(m: MonthlyBranchSummary): number {
  return (
    m.expenseRent +
    m.expenseStaff +
    m.expenseUtility +
    m.expenseComm +
    m.expenseSupplies +
    m.expenseInsurance +
    m.expenseVending +
    m.expenseAED +
    m.expenseFee +
    m.expenseUnknown +
    m.costOfSales
  )
}

// 참고용: 시트만으로 계산한 총매출·지출·이익 (매니저비·매출은 DB로 대체 전 baseline)
export function totalRevenue(m: MonthlyBranchSummary): number {
  return (
    m.revenueSocial +
    m.revenueRental +
    m.revenueVending +
    m.revenueAcademy +
    m.revenueUnknown
  )
}

export function totalExpense(m: MonthlyBranchSummary): number {
  return sheetFixedExpense(m)
}

export function operatingProfit(m: MonthlyBranchSummary): number {
  return totalRevenue(m) - m.expenseManager - totalExpense(m)
}
