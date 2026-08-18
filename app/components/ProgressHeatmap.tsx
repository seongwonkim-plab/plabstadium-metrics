import {
  HEATMAP_HOURS,
  HEATMAP_WEEKDAYS,
  WEEKDAY_LABELS,
  type HeatmapCell,
} from "@/lib/heatmap"

// 진행률 → 배경색 (빨강 0% ~ 회색 70% ~ 초록 100%)
function rateColor(rate: number | null): { bg: string; fg: string } {
  if (rate === null) return { bg: "transparent", fg: "#9ca3af" }
  const clamped = Math.max(0, Math.min(1, rate))
  if (clamped < 0.7) {
    // 0.0 (red 900) → 0.7 (neutral 100)
    const t = clamped / 0.7
    const r = Math.round(220 - t * (220 - 245))
    const g = Math.round(38 + t * (245 - 38))
    const b = Math.round(38 + t * (245 - 38))
    return {
      bg: `rgb(${r},${g},${b})`,
      fg: clamped < 0.4 ? "#ffffff" : "#111827",
    }
  }
  // 0.7 (neutral 100) → 1.0 (green 700)
  const t = (clamped - 0.7) / 0.3
  const r = Math.round(245 - t * (245 - 21))
  const g = Math.round(245 - t * (245 - 128))
  const b = Math.round(245 - t * (245 - 61))
  return {
    bg: `rgb(${r},${g},${b})`,
    fg: clamped > 0.9 ? "#ffffff" : "#065f46",
  }
}

export function ProgressHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const cellByKey = new Map(cells.map((c) => [`${c.weekday}|${c.hour}`, c]))
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="overflow-x-auto">
        <table className="w-full tabular border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="w-8" />
              {HEATMAP_HOURS.map((h) => (
                <th
                  key={h}
                  className="text-[10px] font-normal text-neutral-500 pb-1"
                  style={{ minWidth: 32 }}
                >
                  {h}시
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_WEEKDAYS.map((w) => (
              <tr key={w}>
                <td className="text-[11px] font-medium text-neutral-600 pr-2 text-right">
                  {WEEKDAY_LABELS[w - 1]}
                </td>
                {HEATMAP_HOURS.map((h) => {
                  const c = cellByKey.get(`${w}|${h}`)
                  if (!c || c.rate === null) {
                    return (
                      <td
                        key={h}
                        className="text-center text-[10px] text-neutral-300"
                        style={{ height: 44, background: "#fafafa" }}
                      >
                        —
                      </td>
                    )
                  }
                  const { bg, fg } = rateColor(c.rate)
                  const pct = (c.rate * 100).toFixed(0)
                  return (
                    <td
                      key={h}
                      className="text-center rounded"
                      style={{
                        height: 44,
                        background: bg,
                        color: fg,
                      }}
                      title={`${WEEKDAY_LABELS[w - 1]} ${h}시 · 진행 ${c.release} · 취소 ${c.cancel} · 진행률 ${pct}%`}
                    >
                      <div className="text-[12px] font-semibold leading-tight">
                        {pct}%
                      </div>
                      <div className="text-[10px] opacity-80 leading-tight">
                        {c.release}/{c.release + c.cancel}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-neutral-500">
        <span>진행률 낮음</span>
        <div className="flex h-2 w-40 rounded">
          <div style={{ background: "#dc2626", flex: 1 }} />
          <div style={{ background: "#f5f5f5", flex: 1 }} />
          <div style={{ background: "#158049", flex: 1 }} />
        </div>
        <span>진행률 높음</span>
        <span className="ml-4">셀 상단: 진행률 · 하단: 진행 / 세팅 (예: 1/3 = 3건 중 1건 진행)</span>
      </div>
    </div>
  )
}
