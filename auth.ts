import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Auth.js v5 · Google OAuth · @plabfootball.com 도메인만 허용
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // hd 파라미터로 Google 로그인 화면에서도 도메인 힌트 (UX 개선)
      authorization: {
        params: { hd: "plabfootball.com" },
      },
    }),
  ],
  callbacks: {
    // 이메일 도메인 검증 — hd 는 우회 가능하므로 서버 측 재검증 필수
    async signIn({ profile }) {
      const email = profile?.email
      if (!email) return false
      return email.toLowerCase().endsWith("@plabfootball.com")
    },
    // 세션에 이름·이메일 그대로 노출
    async session({ session, token }) {
      if (token.email) session.user.email = token.email
      if (token.name) session.user.name = token.name
      return session
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Vercel 뒤 프록시 감지 (production 자동이지만 명시)
  trustHost: true,
})
