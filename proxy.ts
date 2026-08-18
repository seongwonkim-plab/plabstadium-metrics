import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE_NAME, isValidAuthCookie } from "@/lib/auth"

// 인증 필요 없는 경로: 로그인/로그아웃 API, 로그인 페이지, 헬스체크(사이드바 표시용).
// 정적 자산은 matcher에서 이미 배제됨.
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/login",
  "/api/logout",
  "/api/health",
])

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value
  if (await isValidAuthCookie(cookie)) return NextResponse.next()

  const loginUrl = new URL("/login", req.url)
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname + req.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // 모든 경로. 단 _next 내부·favicon·이미지·정적 파일은 제외.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)).*)",
  ],
}
