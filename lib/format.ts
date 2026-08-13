export function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`
}

export function wonShort(n: number): string {
  return Math.round(n).toLocaleString("ko-KR")
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function pctDelta(n: number, digits = 1): string {
  const s = `${(n * 100).toFixed(digits)}%p`
  if (n > 0) return `▲ ${s}`
  if (n < 0) return `▼ ${s.replace("-", "")}`
  return `— ${s}`
}

export function deltaLabel(cur: number, prev: number): {
  text: string
  tone: "success" | "danger" | "neutral"
} {
  if (prev === 0) return { text: "—", tone: "neutral" }
  const ratio = (cur - prev) / prev
  const abs = Math.abs(ratio) * 100
  if (ratio > 0) return { text: `▲ ${abs.toFixed(1)}%`, tone: "success" }
  if (ratio < 0) return { text: `▼ ${abs.toFixed(1)}%`, tone: "danger" }
  return { text: "— 0%", tone: "neutral" }
}
