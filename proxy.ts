import { NextResponse } from "next/server"
import { auth } from "@/auth"

// 인증 불필요 경로:
//  - /login (Google 로그인 페이지)
//  - /api/auth/* (Auth.js 콜백/세션)
//  - /api/health (사이드바 상태 표시기)
//  - /api/freeze (Bearer CRON_SECRET 자체 검증)
const PUBLIC_PATHS = [
  /^\/login$/,
  /^\/api\/auth(\/.*)?$/,
  /^\/api\/health$/,
  /^\/api\/freeze$/,
]

function withPathname(pathname: string) {
  // 서버 컴포넌트에서 headers() 로 읽을 수 있도록 요청 헤더에 심음
  const requestHeaders = new Headers()
  requestHeaders.set("x-pathname", pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((r) => r.test(pathname))) return withPathname(pathname)

  // Bearer CRON_SECRET 도 허용 (Vercel Cron 이 다른 라우트를 미래에 호출할 수 있으므로)
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return withPathname(pathname)

  // 세션 검증 · 없으면 로그인 페이지로
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }
  return withPathname(pathname)
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)).*)",
  ],
}
