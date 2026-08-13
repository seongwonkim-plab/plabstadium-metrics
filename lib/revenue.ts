import { plabQuery } from "./plab"
import { OPEN_BRANCHES } from "./branches"

export type DbRevenue = {
  groupId: number
  socialRevenue: number
  rentalRevenue: number
  managerCost: number // 우선순위 결정된 최종값 (DB 실지급 > 시트값 · 페이지 로직에서 override 가능)
  managerCostActual: number // manager_settlement 실지급액 (2024-01~ 존재)
  managerCostEstimate: number // match_type_pay 기본가 추정 (모든 시기 계산 가능)
  releaseMatchCount: number
}

function emptyRow(groupId: number): DbRevenue {
  return {
    groupId,
    socialRevenue: 0,
    rentalRevenue: 0,
    managerCost: 0,
    managerCostActual: 0,
    managerCostEstimate: 0,
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
    const [socialRes, socialOldRes, rentalRes, mgrRes, mgrEstRes] = await Promise.all([
      // 소셜 매출 (새 경로): 최근 데이터는 cash_history → order → match_apply
      // cash_type: SOCIAL(참가비) - REFUND_CASH(CANCEL/NULL만 · REWARD는 프로모션이라 제외)
      plabQuery<{ group_id: number; net: number }>(
        `SELECT s.group_id,
                COALESCE(SUM(
                  CASE
                    WHEN ch.cash_type IN ('SOCIAL', 'MATCH_PURCHASE') THEN -ch.cash
                    WHEN ch.cash_type = 'REFUND_CASH'
                         AND (ch.action IS NULL OR ch.action = 'CANCEL') THEN -ch.cash
                    WHEN ch.cash_type LIKE 'MATCH_CANCEL_%' THEN -ch.cash
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
      // 소셜 매출 (옛날 경로): cash_history.match_apply_id 직접 조인 (~2023년 초까지 데이터).
      // ⚠️ order_id IS NULL 필터로 새 경로와 배타적으로 만들어 중복 합산 방지.
      plabQuery<{ group_id: number; net: number }>(
        `SELECT s.group_id,
                COALESCE(SUM(
                  CASE
                    WHEN ch.cash_type IN ('SOCIAL', 'MATCH_PURCHASE') THEN -ch.cash
                    WHEN ch.cash_type = 'REFUND_CASH'
                         AND (ch.action IS NULL OR ch.action = 'CANCEL') THEN -ch.cash
                    WHEN ch.cash_type LIKE 'MATCH_CANCEL_%' THEN -ch.cash
                    ELSE 0
                  END
                ), 0) AS net
         FROM cash_history ch
         JOIN match_apply ma ON ma.id = ch.match_apply_id
         JOIN \`match\` m ON m.id = ma.match_id
         JOIN stadium s ON s.id = m.stadium_id
         WHERE s.group_id IN (${groupIds})
           AND ch.match_apply_id IS NOT NULL
           AND ch.order_id IS NULL
           AND m.status = 'RELEASE'
           AND ma.apply_type = 'CASH'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${from}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${to}'
         GROUP BY s.group_id`,
      ),
      // 대관 매출: stadium_product (product_type=RENTAL, product_status=SOLDOUT).
      // stadium_rental_monthly_settlement는 2026-06 이후만 채워지므로 사용 X.
      plabQuery<{ stadium_group_id: number; gross: number }>(
        `SELECT s.group_id AS stadium_group_id,
                COALESCE(SUM(sp.product_price), 0) AS gross
         FROM stadium_product sp
         JOIN stadium s ON s.id = sp.stadium_id
         WHERE s.group_id IN (${groupIds})
           AND sp.product_type = 'RENTAL'
           AND sp.product_status = 'SOLDOUT'
           AND sp.date >= '${from}' AND sp.date < '${to}'
         GROUP BY s.group_id`,
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
      // 폴백: manager_settlement 없는 시기 (2024-08 이전) 대비
      // match.match_type_id → match_type_pay.price 기본가로 추정
      plabQuery<{ group_id: number; est: number; cnt: number }>(
        `SELECT s.group_id,
                COALESCE(SUM(mtp.price), 0) AS est,
                COUNT(*) AS cnt
         FROM \`match\` m
         JOIN stadium s ON s.id = m.stadium_id
         JOIN match_type_pay mtp ON mtp.id = m.match_type_id
         WHERE s.group_id IN (${groupIds})
           AND m.status = 'RELEASE'
           AND CONVERT_TZ(m.schedule,'+00:00','+09:00') >= '${from}'
           AND CONVERT_TZ(m.schedule,'+00:00','+09:00') < '${to}'
         GROUP BY s.group_id`,
      ),
    ])

    if (socialRes.success) {
      for (const r of socialRes.data ?? []) {
        const b = result.get(Number(r.group_id))
        if (b) b.socialRevenue += Number(r.net) || 0
      }
    }
    if (socialOldRes.success) {
      for (const r of socialOldRes.data ?? []) {
        const b = result.get(Number(r.group_id))
        if (b) b.socialRevenue += Number(r.net) || 0
      }
    }
    if (rentalRes.success) {
      for (const r of rentalRes.data ?? []) {
        const b = result.get(Number(r.stadium_group_id))
        if (b) b.rentalRevenue = Number(r.gross) || 0
      }
    }
    // 매니저비: manager_settlement 값이 있으면 그것 사용, 없으면 기본가 추정으로 폴백
    const mgrMap = new Map<number, number>()
    const mgrCntMap = new Map<number, number>()
    if (mgrRes.success) {
      for (const r of mgrRes.data ?? []) {
        mgrMap.set(Number(r.group_id), Number(r.total) || 0)
        mgrCntMap.set(Number(r.group_id), Number(r.cnt) || 0)
      }
    }
    const estMap = new Map<number, number>()
    const estCntMap = new Map<number, number>()
    if (mgrEstRes.success) {
      for (const r of mgrEstRes.data ?? []) {
        estMap.set(Number(r.group_id), Number(r.est) || 0)
        estCntMap.set(Number(r.group_id), Number(r.cnt) || 0)
      }
    }
    for (const b of result.values()) {
      const settled = mgrMap.get(b.groupId) ?? 0
      const settledCnt = mgrCntMap.get(b.groupId) ?? 0
      const est = estMap.get(b.groupId) ?? 0
      const estCnt = estCntMap.get(b.groupId) ?? 0
      b.managerCostActual = settled
      b.managerCostEstimate = est
      // 기본 우선순위: DB 실지급 > 기본가 추정
      // 페이지에서 시트값이 있으면 override 가능 (managerCostActual === 0 인 시기)
      b.managerCost = settled > 0 ? settled : est
      b.releaseMatchCount = settled > 0 ? settledCnt : estCnt
    }
  } catch {
    // API 오류 시 기본값 유지
  }
  return result
}
