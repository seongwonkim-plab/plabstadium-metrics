import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Auth.js v5 · Google OAuth · @plabfootball.com 도메인만 허용
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: { hd: "plabfootball.com" },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email
      if (!email) return false
      return email.toLowerCase().endsWith("@plabfootball.com")
    },
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
  trustHost: true,
  // Vercel 프록시 뒤에서 __Host- 접두어 쿠키가 안정적으로 동작하지 않아
  // 접두어 없이 Secure 만 지정. HTTPS 전용이므로 실질 보안은 유지.
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    callbackUrl: {
      name: "authjs.callback-url",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    csrfToken: {
      name: "authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    pkceCodeVerifier: {
      name: "authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: "authjs.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: "authjs.nonce",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
  },
})
