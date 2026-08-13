import { plabQuery } from "./plab"
import { OPEN_BRANCHES } from "./branches"

export type DbRevenue = {
  groupId: number
  socialRevenue: number
  rentalRevenue: number
  managerCost: number
  releaseMatchCount: number
}

function emptyRow(groupId: number): DbRevenue {
  return {
    groupId,
    socialRevenue: 0,
    rentalRevenue: 0,
    managerCost: 0,
    releaseMatchCount: 0,
  }
}

export async function dbRevenueByBranch(
  year: number,
  month: number,
): Promise<Map<number, DbRevenue>> {
  const result = new Map<number, DbRevenue>()
  for (const b of OPEN_BRANCHES) result.set(b.groupId, emptyRow(b.groupId))

  const groupIds = OPEN_BRANCHES.map((b) => b.groupId).join(",")
  const from = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

  try {
    const [socialRes, rentalRes, mgrRes] = await Promise.all([
      plabQuery<{ group_id: number; net: number }>(
        `SELECT s.group_id,
                COALESCE(SUM(
                  CASE
                    WHEN ch.cash_type = 'SOCIAL' AND ch.action = 'USE' THEN -ch.cash
                    WHEN ch.cash_type = 'REFUND_CASH' AND ch.action = 'CANCEL' THEN -ch.cash
                    ELSE 0
                  END
                ), 0) AS net
         FROM cash_history ch
         JOIN \`order\` o ON o.id = ch.order_id
         JOIN match_apply ma ON ma.id = o.match_apply_id
         JOIN \`match\` m ON m.id = ma.match_id
         JOIN stadium s ON s.id = m.stadium_id
         WHERE s.group_id IN (${groupIds})
           AND m.status = 'RELEASE'
           AND ma.apply_type = 'CASH'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${from}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${to}'
         GROUP BY s.group_id`,
      ),
      plabQuery<{ stadium_group_id: number; gross: number }>(
        `SELECT stadium_group_id,
                COALESCE(SUM(gross_amount - cancel_fee_amount), 0) AS gross
         FROM stadium_rental_monthly_settlement
         WHERE stadium_group_id IN (${groupIds})
           AND year = ${year} AND month = ${month}
         GROUP BY stadium_group_id`,
      ),
      plabQuery<{ group_id: number; total: number; cnt: number }>(
        `SELECT s.group_id,
                COALESCE(SUM(ms.settlement_amount), 0) AS total,
                COUNT(*) AS cnt
         FROM manager_settlement ms
         JOIN \`match\` m ON m.id = ms.match_id
         JOIN stadium s ON s.id = m.stadium_id
         WHERE s.group_id IN (${groupIds})
           AND ms.year = ${year} AND ms.month = ${month}
           AND m.status = 'RELEASE'
         GROUP BY s.group_id`,
      ),
    ])

    if (socialRes.success) {
      for (const r of socialRes.data ?? []) {
        const b = result.get(Number(r.group_id))
        if (b) b.socialRevenue = Number(r.net) || 0
      }
    }
    if (rentalRes.success) {
      for (const r of rentalRes.data ?? []) {
        const b = result.get(Number(r.stadium_group_id))
        if (b) b.rentalRevenue = Number(r.gross) || 0
      }
    }
    if (mgrRes.success) {
      for (const r of mgrRes.data ?? []) {
        const b = result.get(Number(r.group_id))
        if (b) {
          b.managerCost = Number(r.total) || 0
          b.releaseMatchCount = Number(r.cnt) || 0
        }
      }
    }
  } catch {
    // API 오류 시 기본값 유지
  }
  return result
}
