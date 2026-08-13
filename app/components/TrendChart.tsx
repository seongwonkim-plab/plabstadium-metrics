import { won, pct } from "@/lib/format"

export type TrendPoint = {
  year: number
  month: number
  revenue: number
  expense: number
  progressRate: number | null
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const chartMax = Math.max(1, ...data.flatMap((m) => [m.revenue, m.expense]))
  const chartH = 180 // 막대 영역 픽셀 높이
  const width = 720
  const leftPad = 8
  const rightPad = 8
  const usableW = width - leftPad - rightPad
  const slotW = usableW / data.length
  const barGroupW = slotW * 0.7
  const barGap = 3
  const barW = (barGroupW - barGap) / 2

  // 진행률 점: 0~1 → 상단 오버레이. 100%가 chart 상단 근처.
  const rateY = (rate: number | null) => {
    if (rate === null) return null
    return chartH * (1 - rate) + 8 // 상단 여백 8px
  }

  const points = data
    .map((m, i) => {
      const y = rateY(m.progressRate)
      if (y === null) return null
      const x = leftPad + slotW * (i + 0.5)
      return { x, y, rate: m.progressRate!, i }
    })
    .filter((p): p is { x: number; y: number; rate: number; i: number } => p !== null)

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${chartH + 40}`}
          width="100%"
          preserveAspectRatio="none"
          style={{ minWidth: "560px" }}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={leftPad}
              x2={width - rightPad}
              y1={chartH * (1 - f) + 8}
              y2={chartH * (1 - f) + 8}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}

          {data.map((m, i) => {
            const isLast = i === data.length - 1
            const cx = leftPad + slotW * (i + 0.5)
            const revH = (m.revenue / chartMax) * chartH
            const expH = (m.expense / chartMax) * chartH
            return (
              <g key={`${m.year}-${m.month}`}>
                <rect
                  x={cx - barGroupW / 2}
                  y={chartH - revH + 8}
                  width={barW}
                  height={revH}
                  fill={isLast ? "#1d4ed8" : "#60a5fa"}
                  rx={2}
                >
                  <title>{`매출 ${won(m.revenue)}`}</title>
                </rect>
                <rect
                  x={cx - barGroupW / 2 + barW + barGap}
                  y={chartH - expH + 8}
                  width={barW}
                  height={expH}
                  fill={isLast ? "#4b5563" : "#9ca3af"}
                  rx={2}
                >
                  <title>{`지출 ${won(m.expense)}`}</title>
                </rect>
                <text
                  x={cx}
                  y={chartH + 26}
                  fontSize={10}
                  fill={isLast ? "#111827" : "#6b7280"}
                  fontWeight={isLast ? 500 : 400}
                  textAnchor="middle"
                >
                  {m.month}월
                </text>
              </g>
            )
          })}

          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2}
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            />
          )}
          {points.map((p) => (
            <g key={`dot-${p.i}`}>
              <circle cx={p.x} cy={p.y} r={4} fill="#f59e0b">
                <title>{`진행률 ${pct(p.rate)}`}</title>
              </circle>
              <text
                x={p.x}
                y={p.y - 8}
                fontSize={9}
                fill="#b45309"
                textAnchor="middle"
              >
                {(p.rate * 100).toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded bg-blue-400" /> 매출
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded bg-neutral-400" /> 지출
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> 진행률
        </span>
      </div>
    </div>
  )
}
