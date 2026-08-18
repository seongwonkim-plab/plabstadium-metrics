import { NextResponse, type NextRequest } from "next/server"
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  computeAuthToken,
  verifyPassword,
} from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let body: { password?: string; from?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 })
  }

  const password = body.password ?? ""
  if (!verifyPassword(password)) {
    // 브루트포스 완화: 짧은 지연.
    await new Promise((r) => setTimeout(r, 400))
    return NextResponse.json(
      { ok: false, error: "비밀번호가 일치하지 않습니다." },
      { status: 401 },
    )
  }

  const token = await computeAuthToken()
  const res = NextResponse.json({ ok: true, from: body.from ?? "/" })
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  })
  return res
}
