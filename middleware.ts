import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// NextAuth v4 미들웨어 · @plabfootball.com 세션 없으면 /login 으로
export default withAuth(
  function middleware() {
    // 인증 통과 시 그대로 진행
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // Vercel Cron 이 /api/freeze 호출 시 Bearer CRON_SECRET 도 허용
        const authHeader = req.headers.get("authorization")
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
        return !!token
      },
    },
    pages: { signIn: "/login" },
  },
)

export const config = {
  matcher: [
    // 인증 필요 경로 (아래는 제외):
    //  - /login (로그인 페이지)
    //  - /api/auth/* (NextAuth 콜백)
    //  - /api/health (사이드바 상태)
    //  - /_next 정적 리소스
    //  - 파일 확장자
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)).*)",
  ],
}
