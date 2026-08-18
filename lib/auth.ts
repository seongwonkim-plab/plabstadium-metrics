// 미들웨어(Edge) + API 라우트(Node) 양쪽에서 쓰는 HMAC 유틸.
// Web Crypto만 사용해서 Edge 런타임 호환.

const enc = new TextEncoder()

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// 상수시간 문자열 비교 (동일 길이만 비교, 짧으면 fail)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function computeAuthToken(): Promise<string> {
  const secret = process.env.DASHBOARD_AUTH_SECRET
  if (!secret) throw new Error("DASHBOARD_AUTH_SECRET is not set")
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("authed:v1"))
  return bufToHex(sig)
}

export async function isValidAuthCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  try {
    const expected = await computeAuthToken()
    return timingSafeEqual(cookieValue, expected)
  } catch {
    return false
  }
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD ?? ""
  if (!expected) return false
  return timingSafeEqual(input, expected)
}

export const AUTH_COOKIE_NAME = "dashboard_auth"
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7일
