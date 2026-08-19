import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// 인증 미들웨어 · getToken 을 직접 호출해서 커스텀 cookieName 지정
// (withAuth 는 __Secure- 접두어 기본값이 auth-options 의 커스텀 쿠키와 안 맞아 무한 리다이렉트)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Bearer CRON_SECRET (Vercel Cron 용) 은 세션 없이도 통과
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return NextResponse.next()
  }

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

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 인증 필요 경로. 아래는 제외:
    //  - /login, /api/auth/*, /api/health
    //  - _next 정적 리소스, 파일 확장자
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)).*)",
  ],
}
