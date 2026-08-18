/**
 * 특정 월을 API 에서 조회해 data/frozen/<YYYY-MM>.json 에 저장.
 *
 * 사용법:
 *   npx tsx scripts/freeze-month.ts <year> <month>
 *   예: npx tsx scripts/freeze-month.ts 2024 5
 *
 * 백필용:
 *   npx tsx scripts/backfill.ts
 */

import { config as loadEnv } from "dotenv"
import path from "node:path"
import { freezeMonth } from "../lib/freeze-job"

// .env.local 로드
loadEnv({ path: path.resolve(process.cwd(), ".env.local") })

async function main() {
  const [, , yearStr, monthStr] = process.argv
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    console.error("Usage: npx tsx scripts/freeze-month.ts <year> <month>")
    process.exit(1)
  }
  console.log(`[freeze] ${year}-${String(month).padStart(2, "0")} 시작...`)
  const started = Date.now()
  const data = await freezeMonth(year, month)
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  const branchCount = Object.keys(data.byBranch).length
  const heatmapCells = data.heatmap.filter((c) => c.rate !== null).length
  console.log(
    `[freeze] ${data.yearMonth} 완료 (${elapsed}s) · 지점 ${branchCount}개 · 히트맵 활성 셀 ${heatmapCells}`,
  )
}

main().catch((e) => {
  console.error("[freeze] 실패:", e)
  process.exit(1)
})
