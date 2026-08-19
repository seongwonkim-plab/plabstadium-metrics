import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// NextAuth v4 · Google OAuth · @plabfootball.com 도메인 제한
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          hd: "plabfootball.com", // Google 로그인 화면에서 도메인 힌트 (UX)
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    // 서버 측 도메인 재검증 (hd 파라미터는 우회 가능)
    async signIn({ profile }) {
      const email = profile?.email
      if (!email) return false
      return email.toLowerCase().endsWith("@plabfootball.com")
    },
    // 세션에 이메일·이름 노출
    async session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email
        if (token.name) session.user.name = token.name
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  // Vercel 프록시 뒤에서 __Secure- 접두어 쿠키가 안정적이지 않음 (state·pkce 소실).
  // 접두어 제거하되 secure:true 유지 (HTTPS 전용이므로 실질 보안 동일).
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 900,
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 900,
      },
    },
    nonce: {
      name: "next-auth.nonce",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
  },
}
