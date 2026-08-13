import { plabQuery } from "./plab"
import { OPEN_BRANCHES } from "./branches"

export type HeatmapCell = {
  weekday: number // 1=월 ~ 7=일 (yoil 컨벤션)
  hour: number // 7 ~ 23
  release: number
  cancel: number
  rate: number | null
}

export const HEATMAP_HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 07~23
export const HEATMAP_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]
export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]

export async function progressHeatmap(
  year: number,
  month: number,
): Promise<HeatmapCell[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  const groupIds = OPEN_BRANCHES.map((b) => b.groupId).join(",")

  const cells: HeatmapCell[] = []
  for (const w of HEATMAP_WEEKDAYS) {
    for (const h of HEATMAP_HOURS) {
      cells.push({ weekday: w, hour: h, release: 0, cancel: 0, rate: null })
    }
  }
  const cellIndex = new Map<string, HeatmapCell>(
    cells.map((c) => [`${c.weekday}|${c.hour}`, c]),
  )

  try {
    const res = await plabQuery<{
      w: number
      h: number
      status: string
      c: number
    }>(
      `SELECT (WEEKDAY(CONVERT_TZ(m.schedule, '+00:00', '+09:00')) + 1) AS w,
              HOUR(CONVERT_TZ(m.schedule, '+00:00', '+09:00')) AS h,
              m.status, COUNT(*) AS c
       FROM \`match\` m
       JOIN stadium s ON s.id = m.stadium_id
       WHERE s.group_id IN (${groupIds})
         AND m.status IN ('RELEASE', 'CANCEL')
         AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') >= '${from}'
         AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < '${to}'
         AND CONVERT_TZ(m.schedule, '+00:00', '+09:00') < CONVERT_TZ(NOW(), '+00:00', '+09:00')
       GROUP BY w, h, m.status`,
    )
    if (res.success) {
      for (const r of res.data ?? []) {
        const cell = cellIndex.get(`${Number(r.w)}|${Number(r.h)}`)
        if (!cell) continue
        if (r.status === "RELEASE") cell.release += Number(r.c)
        else if (r.status === "CANCEL") cell.cancel += Number(r.c)
      }
      for (const c of cells) {
        const total = c.release + c.cancel
        c.rate = total > 0 ? c.release / total : null
      }
    }
  } catch {
    // API 오류 시 기본값 유지
  }
  return cells
}
