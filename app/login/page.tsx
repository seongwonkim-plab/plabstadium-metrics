import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { LoginButton } from "./LoginButton"

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  const sp = await searchParams

  if (session?.user) {
    redirect(sp.callbackUrl ?? "/")
  }

  const errorMessage = (() => {
    if (!sp.error) return null
    if (sp.error === "AccessDenied")
      return "@plabfootball.com 계정만 접근 가능합니다."
    if (sp.error === "OAuthAccountNotLinked")
      return "이미 다른 방식으로 가입한 이메일입니다."
    return `로그인 오류: ${sp.error}`
  })()

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="text-base font-semibold">플랩 직영구장 지표</div>
          <div className="mt-1 text-xs text-neutral-500">
            운영파트 대시보드 · @plabfootball.com 계정으로 로그인
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        <LoginButton callbackUrl={sp.callbackUrl ?? "/"} />

        <div className="text-center text-[10px] text-neutral-400">
          로그인 시 사용자 이메일과 이름만 저장됩니다.
        </div>
      </div>
    </div>
  )
}
