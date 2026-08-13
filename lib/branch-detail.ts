import { plabQuery } from "./plab"

export type Stadium = {
  id: number
  name: string
  shortName: string
  isOpen: boolean
}

export type BranchInfo = {
  openDate: string | null
  stadiums: Stadium[]
}

export type StadiumMatchStats = {
  stadiumId: number
  name: string
  setup: number
  release: number
  cancel: number
  progressRate: number | null
  revenue: number
}

export async function loadBranchInfo(groupId: number): Promise<BranchInfo> {
  try {
    const [stadiumRes, openRes] = await Promise.all([
      plabQuery<{ id: number; name: string; short_name: string; is_open: number }>(
        `SELECT id, name, short_name, is_open
         FROM stadium
         WHERE group_id = ${groupId}
         ORDER BY id`,
      ),
      plabQuery<{ first_release: string }>(
        `SELECT MIN(CONVERT_TZ(m.schedule, '+00:00', '+09:00')) AS first_release
         FROM \`match\` m
         JOIN stadium s ON s.id = m.stadium_id
         WHERE s.group_id = ${groupId} AND m.status = 'RELEASE'`,
      ),
    ])
    return {
      openDate: openRes.data?.[0]?.first_release ?? null,
      stadiums: (stadiumRes.data ?? []).map((s) => ({
        id: Number(s.id),
        name: s.name,
        shortName: s.short_name,
        isOpen: Number(s.is_open) === 1,
      })),
    }
  } catch {
    return { openDate: null, stadiums: [] }
  }
}

export async function matchStatsByStadium(
  groupId: number,
  year: number,
  month: number,
): Promise<StadiumMatchStats[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

  try {
    const [matchRes, revRes] = await Promise.all([
      plabQuery<{ stadium_id: number; name: string; status: string; c: number }>(
        `SELECT m.stadium_id, s.name, m.status, COUNT(*) AS c
         FROM \`match\` m
         JOIN stadium s ON s.id = m.stadium_id
         WHERE s.group_id = ${groupId}
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${from}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${to}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < CONVERT_TZ(NOW(), '+00:00', '+09:00')
           AND m.status IN ('RELEASE', 'CANCEL')
         GROUP BY m.stadium_id, s.name, m.status`,
      ),
      plabQuery<{ stadium_id: number; net_cash: number }>(
        `SELECT m.stadium_id,
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
         WHERE s.group_id = ${groupId}
           AND m.status = 'RELEASE'
           AND ma.apply_type = 'CASH'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${from}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${to}'
           AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < CONVERT_TZ(NOW(), '+00:00', '+09:00')
         GROUP BY m.stadium_id`,
      ),
    ])

    const byId = new Map<number, StadiumMatchStats>()
    for (const r of matchRes.data ?? []) {
      const id = Number(r.stadium_id)
      if (!byId.has(id)) {
        byId.set(id, {
          stadiumId: id,
          name: r.name,
          setup: 0,
          release: 0,
          cancel: 0,
          progressRate: null,
          revenue: 0,
        })
      }
      const bucket = byId.get(id)!
      const c = Number(r.c)
      if (r.status === "RELEASE") bucket.release += c
      else if (r.status === "CANCEL") bucket.cancel += c
    }
    for (const r of revRes.data ?? []) {
      const bucket = byId.get(Number(r.stadium_id))
      if (bucket) bucket.revenue = Number(r.net_cash) || 0
    }
    for (const b of byId.values()) {
      b.setup = b.release + b.cancel
      b.progressRate = b.setup > 0 ? b.release / b.setup : null
    }
    return Array.from(byId.values()).sort((a, b) => a.stadiumId - b.stadiumId)
  } catch {
    return []
  }
}
