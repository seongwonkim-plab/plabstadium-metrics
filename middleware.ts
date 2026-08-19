import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// 인증 미들웨어 + 요청 헤더에 x-pathname 심어서 서버 컴포넌트에서 현재 경로 판정 가능케 함
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 서버 컴포넌트가 headers().get("x-pathname") 로 읽을 수 있게 세팅
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", pathname)
  const withHeader = () =>
    NextResponse.next({ request: { headers: requestHeaders } })

  // /login 은 인증 체크 스킵 (그래도 x-pathname 은 전달)
  if (pathname === "/login") return withHeader()

  // Bearer CRON_SECRET (Vercel Cron) 은 세션 없이도 통과
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return withHeader()

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  })

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search)
    }
    return NextResponse.redirect(loginUrl)
  }

  return withHeader()
}

export const config = {
  matcher: [
    // /login 도 매처에 포함 (인증 로직에서 스킵하지만 x-pathname 은 필요)
    // 제외: /api/auth/*, /api/health, 정적 리소스
    "/((?!api/auth|api/health|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)).*)",
  ],
}
