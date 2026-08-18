/**
 * 2020-01 ~ 3개월 전까지 모든 월을 순차적으로 freeze.
 * 이미 파일이 있는 월은 건너뜀 (덮어쓰지 않음).
 *
 * 사용법: npx tsx scripts/backfill.ts
 * 강제 재freeze: npx tsx scripts/backfill.ts --force
 */

import { config as loadEnv } from "dotenv"
import path from "node:path"
import { promises as fs } from "node:fs"
import { freezeMonth } from "../lib/freeze-job"
import { frozenPath, FREEZE_CUTOFF_MONTHS } from "../lib/frozen"
import { currentYearMonth, previousMonth } from "../lib/period"
import { DATA_START_YEAR } from "../lib/period"

loadEnv({ path: path.resolve(process.cwd(), ".env.local") })

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const force = process.argv.includes("--force")

  // 시작: DATA_START_YEAR-01, 끝: FREEZE_CUTOFF_MONTHS 개월 전
  const now = currentYearMonth()
  let cutoff = now
  for (let i = 0; i < FREEZE_CUTOFF_MONTHS; i++) {
    cutoff = previousMonth(cutoff.year, cutoff.month)
  }

  const targets: { year: number; month: number }[] = []
  for (let y = DATA_START_YEAR; y <= cutoff.year; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === cutoff.year && m > cutoff.month) break
      targets.push({ year: y, month: m })
    }
  }
  console.log(`[backfill] 총 ${targets.length}개월 대상 (${targets[0].year}-${targets[0].month} ~ ${cutoff.year}-${cutoff.month})`)

  let done = 0
  let skipped = 0
  let failed = 0
  const started = Date.now()

  for (const t of targets) {
    const p = frozenPath(t.year, t.month)
    if (!force && (await fileExists(p))) {
      skipped++
      continue
    }
    try {
      const jobStart = Date.now()
      await freezeMonth(t.year, t.month)
      const elapsed = ((Date.now() - jobStart) / 1000).toFixed(1)
      done++
      console.log(
        `  ✓ ${t.year}-${String(t.month).padStart(2, "0")} (${elapsed}s) · 진행 ${done}/${targets.length - skipped}`,
      )
      // API 부하 완화: 각 월 사이 500ms 대기
      await new Promise((r) => setTimeout(r, 500))
    } catch (e) {
      failed++
      console.error(`  ✗ ${t.year}-${String(t.month).padStart(2, "0")}:`, e)
      // 실패해도 계속 진행 (일부 월은 API 문제로 실패할 수 있음)
    }
  }

  const totalSec = ((Date.now() - started) / 1000).toFixed(0)
  console.log(
    `\n[backfill] 완료 · 저장 ${done} · 건너뜀 ${skipped} · 실패 ${failed} · 소요 ${totalSec}s`,
  )
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error("[backfill] 예상치 못한 오류:", e)
  process.exit(1)
})
