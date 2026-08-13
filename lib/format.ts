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

// 전월 대비 라벨. 방향은 항상 (cur - prev) 부호로 판정.
// prev가 음수여도 실제 증감 방향과 일치하게 함 (예: -1.5M → +0.5M = 개선, ▲).
// 크기(%)는 |cur - prev| / |prev| × 100. prev=0이면 대신 절대 변화액을 표기.
export function deltaLabel(cur: number, prev: number): {
  text: string
  tone: "success" | "danger" | "neutral"
} {
  const diff = cur - prev
  if (diff === 0) return { text: "— 0%", tone: "neutral" }
  const tone: "success" | "danger" = diff > 0 ? "success" : "danger"
  const arrow = diff > 0 ? "▲" : "▼"
  if (prev === 0) {
    // 이전이 0일 때는 % 대신 절대 변화액 표기
    const val = Math.round(Math.abs(diff)).toLocaleString("ko-KR")
    return { text: `${arrow} ${val}원`, tone }
  }
  const abs = Math.abs(diff / prev) * 100
  return { text: `${arrow} ${abs.toFixed(1)}%`, tone }
}
