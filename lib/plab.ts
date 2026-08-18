import { unstable_cache } from "next/cache"

// 환경변수는 함수 호출 시점에 읽음 (dotenv 로드 순서 이슈 회피).
function apiUrl(): string {
  return process.env.PLAB_API_URL || "https://data-gateway.preview.plabfootball.com"
}
function apiKey(): string {
  return process.env.PLAB_API_KEY || ""
}

type PlabQueryResponse<T = Record<string, unknown>> = {
  success: boolean
  data?: T[]
  rowCount?: number
  executionTime?: string
  error?: string
}

// 30분 캐시 (Plab API가 반복 503 을 반환하는 상황 대응).
// unstable_cache 는 Vercel Data Cache 를 통해 서버리스 콜드스타트 사이에도
// 캐시가 유지됨. 5분 인메모리 캐시(콜드스타트 시 소실)와는 근본적으로 다름.
const CACHE_TTL_SEC = 30 * 60

// 개별 쿼리 최대 대기 시간 (초과 시 abort 후 실패로 처리).
// Plab API 가 통상 100ms~2s, 최악의 배치 쿼리도 10s 미만.
const QUERY_TIMEOUT_MS = 15_000

// 스크립트 (freeze:backfill 등) 에서 직접 호출용. 캐시 미적용, 실패도 그대로 반환.
export async function plabQueryDirect<T = Record<string, unknown>>(
  query: string,
): Promise<PlabQueryResponse<T>> {
  try {
    return await fetchQueryRaw<T>(query)
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown error",
    }
  }
}

async function fetchQueryRaw<T>(query: string): Promise<PlabQueryResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)
  try {
    const response = await fetch(`${apiUrl()}/api/query`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Plab API ${response.status}: ${await response.text()}`)
    }
    const json = (await response.json()) as PlabQueryResponse<T>
    // success:false 도 throw 해서 캐시되지 않게 함 (재시도 가능)
    if (!json.success) {
      throw new Error(`Plab query failed: ${json.error ?? "unknown"}`)
    }
    return json
  } finally {
    clearTimeout(timeoutId)
  }
}

// Next.js 서버 컨텍스트가 아니면 (예: tsx 스크립트) unstable_cache 는 못 씀.
// 프로세스가 Next.js 서버 프로세스인지 판정.
function inNextRuntime(): boolean {
  return Boolean(
    process.env.NEXT_RUNTIME ||
      process.env.__NEXT_PRIVATE_ORIGIN ||
      process.env.NEXT_PHASE,
  )
}

export async function plabQuery<T = Record<string, unknown>>(
  query: string,
): Promise<PlabQueryResponse<T>> {
  // 스크립트 컨텍스트: 캐시 우회하고 raw fetch 직접
  if (!inNextRuntime()) {
    return plabQueryDirect<T>(query)
  }
  // Next.js 서버: Vercel Data Cache 사용 (unstable_cache).
  // 성공 응답만 캐시 (실패는 throw → 캐시 안 됨 → 다음 호출에서 재시도).
  const cached = unstable_cache(
    async () => fetchQueryRaw<T>(query),
    ["plab-query", query],
    { revalidate: CACHE_TTL_SEC, tags: ["plab"] },
  )
  try {
    return (await cached()) as PlabQueryResponse<T>
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown error",
    }
  }
}
