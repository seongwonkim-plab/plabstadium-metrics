import { promises as fs } from "node:fs"
import path from "node:path"
import { currentYearMonth, previousMonth } from "./period"

// 월별 스냅샷 저장 스키마. Plab API 응답과 동일한 필드 · 지점별로 축약.
export type FrozenBranchStats = {
  socialRevenue: number
  rentalRevenue: number
  managerCostActual: number
  managerCostEstimate: number
  releaseMatchCount: number
  match: {
    release: number
    cancel: number
    setup: number
    progressRate: number | null
  }
}

export type FrozenHeatmapCell = {
  weekday: number
  hour: number
  release: number
  cancel: number
  rate: number | null
}

export type FrozenStadiumHeatmap = {
  stadiumId: number
  name: string
  cells: FrozenHeatmapCell[]
}

export type FrozenMonth = {
  yearMonth: string // "YYYY-MM"
  frozenAt: string // ISO
  byBranch: Record<string, FrozenBranchStats>
  heatmap: FrozenHeatmapCell[] // 전체 영업지점 합계 요일×시간 히트맵
  stadiumHeatmaps: Record<string, FrozenStadiumHeatmap[]> // groupId → 구장별 히트맵
}

export function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function frozenPath(year: number, month: number): string {
  return path.join(process.cwd(), "data", "frozen", `${ymKey(year, month)}.json`)
}

// N개월 이전은 frozen 대상. 예: N=3 → 지금이 9월이면 6월부터 frozen.
export const FREEZE_CUTOFF_MONTHS = 3

// 주어진 월이 frozen 대상인지 (오래됐는지) 판정.
export function isFrozenTarget(year: number, month: number): boolean {
  const now = currentYearMonth()
  let cutoff = now
  for (let i = 0; i < FREEZE_CUTOFF_MONTHS; i++) {
    cutoff = previousMonth(cutoff.year, cutoff.month)
  }
  // cutoff (예: 6월) 이하가 frozen 대상
  const targetKey = year * 12 + month
  const cutoffKey = cutoff.year * 12 + cutoff.month
  return targetKey <= cutoffKey
}

// 파일 읽기 (없으면 null)
export async function readFrozen(
  year: number,
  month: number,
): Promise<FrozenMonth | null> {
  try {
    const buf = await fs.readFile(frozenPath(year, month), "utf8")
    return JSON.parse(buf) as FrozenMonth
  } catch {
    return null
  }
}

// 파일 쓰기 (부모 디렉토리 자동 생성)
export async function writeFrozen(data: FrozenMonth): Promise<void> {
  const [y, m] = data.yearMonth.split("-").map(Number)
  const p = frozenPath(y, m)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf8")
}

// 저장된 월 목록 (관리 페이지용)
export async function listFrozen(): Promise<{ ym: string; frozenAt: string; sizeBytes: number }[]> {
  const dir = path.join(process.cwd(), "data", "frozen")
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return []
  }
  const out: { ym: string; frozenAt: string; sizeBytes: number }[] = []
  for (const name of entries) {
    if (!name.endsWith(".json")) continue
    const ym = name.replace(".json", "")
    const filePath = path.join(dir, name)
    try {
      const [stat, buf] = await Promise.all([fs.stat(filePath), fs.readFile(filePath, "utf8")])
      const data = JSON.parse(buf) as FrozenMonth
      out.push({ ym, frozenAt: data.frozenAt, sizeBytes: stat.size })
    } catch {
      // 파싱 실패 파일은 건너뜀
    }
  }
  return out.sort((a, b) => b.ym.localeCompare(a.ym))
}
