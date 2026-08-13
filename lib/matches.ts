import { plabQuery } from "./plab"
import { OPEN_BRANCHES } from "./branches"

export type BranchMatchStats = {
  groupId: number
  setup: number
  release: number
  cancel: number
  progressRate: number | null
  socialRevenue: number
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

// 주간·월간 공통 통계 조회.
// futurePartial=true (주간 기본): 세팅은 미래 매치 포함 전체, 진행률 계산은 지나간 매치만.
// futurePartial=false (월간 기본): 지나간 매치만 (세팅·진행·취소 모두).
async function fetchMatchStats(
  fromKst: string,
  toKst: string,
  withRevenue: boolean,
  futurePartial: boolean,
): Promise<Map<number, BranchMatchStats>> {
  const result = new Map<number, BranchMatchStats>()
  for (const b of OPEN_BRANCHES) {
    result.set(b.groupId, {
      groupId: b.groupId,
      setup: 0,
      release: 0,
      cancel: 0,
      progressRate: null,
      socialRevenue: 0,
    })
  }
  const groupIds = OPEN_BRANCHES.map((b) => b.groupId).join(",")

  try {
    const matchRes = await plabQuery<{
      group_id: number
      setup_release: number
      setup_cancel: number
      past_release: number
      past_cancel: number
    }>(
      `SELECT s.group_id,
              SUM(CASE WHEN m.status = 'RELEASE' THEN 1 ELSE 0 END) AS setup_release,
              SUM(CASE WHEN m.status = 'CANCEL' THEN 1 ELSE 0 END) AS setup_cancel,
              SUM(CASE WHEN m.status = 'RELEASE'
                        AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < CONVERT_TZ(NOW(), '+00:00', '+09:00')
                       THEN 1 ELSE 0 END) AS past_release,
              SUM(CASE WHEN m.status = 'CANCEL'
                        AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < CONVERT_TZ(NOW(), '+00:00', '+09:00')
                       THEN 1 ELSE 0 END) AS past_cancel
       FROM \`match\` m
       JOIN stadium s ON s.id = m.stadium_id
       WHERE s.group_id IN (${groupIds})
         AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${fromKst}'
         AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${toKst}'
         AND m.status IN ('RELEASE', 'CANCEL')
       GROUP BY s.group_id`,
    )
    if (matchRes.success) {
      for (const r of matchRes.data ?? []) {
        const bucket = result.get(Number(r.group_id))
        if (!bucket) continue
        const setupRelease = Number(r.setup_release) || 0
        const setupCancel = Number(r.setup_cancel) || 0
        const pastRelease = Number(r.past_release) || 0
        const pastCancel = Number(r.past_cancel) || 0

        if (futurePartial) {
          bucket.setup = setupRelease + setupCancel
          bucket.release = pastRelease
          bucket.cancel = pastCancel
          const pastTotal = pastRelease + pastCancel
          bucket.progressRate = pastTotal > 0 ? pastRelease / pastTotal : null
        } else {
          bucket.setup = pastRelease + pastCancel
          bucket.release = pastRelease
          bucket.cancel = pastCancel
          bucket.progressRate = bucket.setup > 0 ? bucket.release / bucket.setup : null
        }
      }
    }

    if (withRevenue) {
      const revRes = await plabQuery<{ group_id: number; net_cash: number }>(
        `SELECT s.group_id,
                COALESCE(SUM(
                  CASE
                    WHEN ch.cash_type = 'SOCIAL' THEN -ch.cash
                    WHEN ch.cash_type = 'REFUND_CASH'
                         AND (ch.action IS NULL OR ch.action = 'CANCEL') THEN -ch.cash
                    ELSE 0
                  END
                ), 0) AS net_cash
         FROM cash_history ch
         JOIN \`order\` o ON o.id = ch.order_id
         JOIN match_apply ma ON ma.id = o.match_apply_id
         JOIN \`match\` m ON m.id = ma.match_id
         JOIN stadium s ON s.id = m.stadium_id
         WHERE s.group_id IN (${groupIds})
           AND m.status = 'RELEASE'
           AND ma.apply_type = 'CASH'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${fromKst}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${toKst}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < CONVERT_TZ(NOW(), '+00:00', '+09:00')
         GROUP BY s.group_id`,
      )
      if (revRes.success) {
        for (const r of revRes.data ?? []) {
          const bucket = result.get(Number(r.group_id))
          if (!bucket) continue
          bucket.socialRevenue = Number(r.net_cash) || 0
        }
      }
    }
  } catch {
    // API 오류 시 기본값 유지
  }
  return result
}

export async function matchStatsByBranch(
  year: number,
  month: number,
): Promise<Map<number, BranchMatchStats>> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  return fetchMatchStats(from, to, false, false)
}

export async function matchStatsByWeek(
  startMonday: Date,
  withRevenue = true,
): Promise<Map<number, BranchMatchStats>> {
  const start = new Date(startMonday)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 7)
  return fetchMatchStats(toIsoDate(start), toIsoDate(end), withRevenue, true)
}

export type WeekTotals = {
  setup: number
  release: number
  socialRevenue: number
  progressRate: number | null
}

export function aggregateWeek(stats: Map<number, BranchMatchStats>): WeekTotals {
  let setup = 0
  let release = 0
  let cancel = 0
  let socialRevenue = 0
  for (const b of stats.values()) {
    setup += b.setup
    release += b.release
    cancel += b.cancel
    socialRevenue += b.socialRevenue
  }
  const pastTotal = release + cancel
  return {
    setup,
    release,
    socialRevenue,
    progressRate: pastTotal > 0 ? release / pastTotal : null,
  }
}
