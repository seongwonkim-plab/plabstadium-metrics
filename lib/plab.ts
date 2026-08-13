const PLAB_API_URL = process.env.PLAB_API_URL || "https://data-gateway.preview.plabfootball.com"
const PLAB_API_KEY = process.env.PLAB_API_KEY || ""

type PlabQueryResponse<T = Record<string, unknown>> = {
  success: boolean
  data?: T[]
  rowCount?: number
  executionTime?: string
  error?: string
}

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { ts: number; data: PlabQueryResponse<unknown> }>()

export async function plabQuery<T = Record<string, unknown>>(
  query: string,
): Promise<PlabQueryResponse<T>> {
  const cached = cache.get(query)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data as PlabQueryResponse<T>
  }
  const response = await fetch(`${PLAB_API_URL}/api/query`, {
    method: "POST",
    headers: {
      "X-API-Key": PLAB_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`Plab API ${response.status}: ${await response.text()}`)
  }
  const json = (await response.json()) as PlabQueryResponse<T>
  // 성공한 응답만 캐시. 429 · 에러는 캐시하지 않아 다음 요청에 재시도.
  if (json.success) {
    cache.set(query, { ts: Date.now(), data: json })
  }
  return json
}
