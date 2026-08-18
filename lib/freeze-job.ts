import { OPEN_BRANCHES } from "./branches"
import { dbRevenueByBranchRange } from "./revenue"
import { matchStatsByBranchRange } from "./matches"
import { progressHeatmap, progressHeatmapByStadium } from "./heatmap"
import {
  writeFrozen,
  ymKey,
  type FrozenMonth,
  type FrozenBranchStats,
  type FrozenStadiumHeatmap,
} from "./frozen"

// 한 월치를 Plab API 에서 뽑아 JSON 저장.
// freeze:backfill 스크립트와 /api/freeze cron 양쪽에서 재사용.
export async function freezeMonth(year: number, month: number): Promise<FrozenMonth> {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const [revRange, matchRange, heatmap, stadiumHeatmapsList] = await Promise.all([
    dbRevenueByBranchRange(year, month, nextYear, nextMonth),
    matchStatsByBranchRange(year, month, nextYear, nextMonth),
    progressHeatmap(year, month),
    Promise.all(
      OPEN_BRANCHES.map(async (b) => ({
        groupId: b.groupId,
        heatmaps: await progressHeatmapByStadium(b.groupId, year, month),
      })),
    ),
  ])

  const key = ymKey(year, month)
  const byBranch: Record<string, FrozenBranchStats> = {}
  for (const b of OPEN_BRANCHES) {
    const rev = revRange.get(b.groupId)?.get(key)
    const match = matchRange.get(b.groupId)?.get(key)
    byBranch[String(b.groupId)] = {
      socialRevenue: rev?.socialRevenue ?? 0,
      rentalRevenue: rev?.rentalRevenue ?? 0,
      managerCostActual: rev?.managerCostActual ?? 0,
      managerCostEstimate: rev?.managerCostEstimate ?? 0,
      releaseMatchCount: rev?.releaseMatchCount ?? 0,
      match: {
        release: match?.release ?? 0,
        cancel: match?.cancel ?? 0,
        setup: match?.setup ?? 0,
        progressRate: match?.progressRate ?? null,
      },
    }
  }

  const stadiumHeatmaps: Record<string, FrozenStadiumHeatmap[]> = {}
  for (const item of stadiumHeatmapsList) {
    stadiumHeatmaps[String(item.groupId)] = item.heatmaps.map((h) => ({
      stadiumId: h.stadiumId,
      name: h.name,
      cells: h.cells,
    }))
  }

  const data: FrozenMonth = {
    yearMonth: key,
    frozenAt: new Date().toISOString(),
    byBranch,
    heatmap,
    stadiumHeatmaps,
  }
  // 데이터가 완전히 비었으면 (API 다운 등) 저장하지 않음
  const hasAnyData = Object.values(byBranch).some(
    (b) =>
      b.socialRevenue !== 0 ||
      b.rentalRevenue !== 0 ||
      b.managerCostActual !== 0 ||
      b.managerCostEstimate !== 0 ||
      b.match.release > 0 ||
      b.match.cancel > 0,
  )
  if (!hasAnyData) {
    throw new Error(
      `${key}: 조회 결과가 모두 0 · API 다운 또는 데이터 없음. 저장 안 함.`,
    )
  }

  await writeFrozen(data)
  return data
}
