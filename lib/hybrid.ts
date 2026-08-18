import { OPEN_BRANCHES } from "./branches"
import { previousMonth, monthsBack } from "./period"
import {
  dbRevenueByBranchRange,
  type DbRevenue,
} from "./revenue"
import {
  matchStatsByBranchRange,
  type BranchMatchStats,
} from "./matches"
import { progressHeatmap, progressHeatmapByStadium, type HeatmapCell, type StadiumHeatmap } from "./heatmap"
import { readFrozen, isFrozenTarget, ymKey } from "./frozen"

// Frozen 데이터를 in-memory DbRevenue/BranchMatchStats 형태로 변환.
function frozenToDb(groupId: number, frozenBranch: Record<string, unknown> | undefined): DbRevenue {
  const fb = frozenBranch as
    | {
        socialRevenue: number
        rentalRevenue: number
        managerCostActual: number
        managerCostEstimate: number
        releaseMatchCount: number
      }
    | undefined
  const actual = fb?.managerCostActual ?? 0
  const estimate = fb?.managerCostEstimate ?? 0
  return {
    groupId,
    socialRevenue: fb?.socialRevenue ?? 0,
    rentalRevenue: fb?.rentalRevenue ?? 0,
    managerCost: actual > 0 ? actual : estimate,
    managerCostActual: actual,
    managerCostEstimate: estimate,
    releaseMatchCount: fb?.releaseMatchCount ?? 0,
  }
}

function frozenToMatch(
  groupId: number,
  frozenBranch: Record<string, unknown> | undefined,
): BranchMatchStats {
  const fb = frozenBranch as
    | {
        match?: {
          release: number
          cancel: number
          setup: number
          progressRate: number | null
        }
      }
    | undefined
  return {
    groupId,
    setup: fb?.match?.setup ?? 0,
    release: fb?.match?.release ?? 0,
    cancel: fb?.match?.cancel ?? 0,
    progressRate: fb?.match?.progressRate ?? null,
    socialRevenue: 0,
  }
}

export type MonthlyData = {
  dbRev: Map<number, DbRevenue>
  match: Map<number, BranchMatchStats>
  source: "frozen" | "live"
}

function fromFrozen(year: number, month: number, frozen: NonNullable<Awaited<ReturnType<typeof readFrozen>>>): MonthlyData {
  const dbRev = new Map<number, DbRevenue>()
  const match = new Map<number, BranchMatchStats>()
  for (const b of OPEN_BRANCHES) {
    dbRev.set(b.groupId, frozenToDb(b.groupId, frozen.byBranch[String(b.groupId)]))
    match.set(b.groupId, frozenToMatch(b.groupId, frozen.byBranch[String(b.groupId)]))
  }
  return { dbRev, match, source: "frozen" }
}

// 한 월의 매출·매치 데이터를 frozen 파일 or live API 로 조회.
// API 장애 대응: live 도 실패하면 frozen 파일이 있으면 사용 (커트오프 이후여도).
export async function loadMonth(year: number, month: number): Promise<MonthlyData> {
  if (isFrozenTarget(year, month)) {
    const frozen = await readFrozen(year, month)
    if (frozen) return fromFrozen(year, month, frozen)
    // frozen 대상인데 파일 없으면 아래 live 로 폴백
  }

  // Live 경로: 해당 월만 범위로 쿼리 (배치 함수 재활용)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const [revRange, matchRange] = await Promise.all([
    dbRevenueByBranchRange(year, month, nextYear, nextMonth),
    matchStatsByBranchRange(year, month, nextYear, nextMonth),
  ])

  // Live 결과가 완전히 비었으면 (API 다운) frozen 파일이라도 fallback
  if (revRange.size === 0 && matchRange.size === 0) {
    const frozen = await readFrozen(year, month)
    if (frozen) return fromFrozen(year, month, frozen)
  }

  const key = ymKey(year, month)
  const dbRev = new Map<number, DbRevenue>()
  const match = new Map<number, BranchMatchStats>()
  for (const b of OPEN_BRANCHES) {
    dbRev.set(
      b.groupId,
      revRange.get(b.groupId)?.get(key) ?? {
        groupId: b.groupId,
        socialRevenue: 0,
        rentalRevenue: 0,
        managerCost: 0,
        managerCostActual: 0,
        managerCostEstimate: 0,
        releaseMatchCount: 0,
      },
    )
    match.set(
      b.groupId,
      matchRange.get(b.groupId)?.get(key) ?? {
        groupId: b.groupId,
        setup: 0,
        release: 0,
        cancel: 0,
        progressRate: null,
        socialRevenue: 0,
      },
    )
  }
  return { dbRev, match, source: "live" }
}

// 여러 월을 한 번에 로드. Frozen 은 파일 병렬 읽기, live 는 배치 쿼리 1회.
export async function loadMonths(
  months: { year: number; month: number }[],
): Promise<Map<string, MonthlyData>> {
  const result = new Map<string, MonthlyData>()

  // Frozen vs live 로 분류
  const frozenTargets = months.filter((m) => isFrozenTarget(m.year, m.month))
  const liveTargets = months.filter((m) => !isFrozenTarget(m.year, m.month))

  // Frozen: 각 파일 병렬 읽기
  await Promise.all(
    frozenTargets.map(async (m) => {
      const key = ymKey(m.year, m.month)
      const frozen = await readFrozen(m.year, m.month)
      if (frozen) {
        const dbRev = new Map<number, DbRevenue>()
        const match = new Map<number, BranchMatchStats>()
        for (const b of OPEN_BRANCHES) {
          dbRev.set(b.groupId, frozenToDb(b.groupId, frozen.byBranch[String(b.groupId)]))
          match.set(b.groupId, frozenToMatch(b.groupId, frozen.byBranch[String(b.groupId)]))
        }
        result.set(key, { dbRev, match, source: "frozen" })
      } else {
        // frozen 파일 없으면 live 로 넘김 (아래에서 처리하도록 리스트에 추가)
        liveTargets.push(m)
      }
    }),
  )

  // Live: 연속된 월이면 하나의 range 쿼리로 묶기. 여기선 단순화해서 개별 로드.
  // 대부분 케이스에서 live 는 최대 2개월(현재 + 이전)이라 큰 이슈 없음.
  if (liveTargets.length > 0) {
    await Promise.all(
      liveTargets.map(async (m) => {
        const key = ymKey(m.year, m.month)
        result.set(key, await loadMonth(m.year, m.month))
      }),
    )
  }

  return result
}

// 히트맵도 frozen vs live 분기
export async function loadHeatmap(year: number, month: number): Promise<HeatmapCell[]> {
  if (isFrozenTarget(year, month)) {
    const frozen = await readFrozen(year, month)
    if (frozen) return frozen.heatmap
  }
  return progressHeatmap(year, month)
}

export async function loadStadiumHeatmaps(
  groupId: number,
  year: number,
  month: number,
): Promise<StadiumHeatmap[]> {
  if (isFrozenTarget(year, month)) {
    const frozen = await readFrozen(year, month)
    if (frozen) return frozen.stadiumHeatmaps[String(groupId)] ?? []
  }
  return progressHeatmapByStadium(groupId, year, month)
}

// 최근 N개월 목록 (오래된 것부터, 신규 것까지)
export function last12Months(year: number, month: number): { year: number; month: number }[] {
  return monthsBack(year, month, 12)
}

// 특정 월의 "직전" 월 계산 (기존 previousMonth 재수출용, hybrid 쓰는 곳에서 편의)
export { previousMonth }
