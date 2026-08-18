import { Suspense } from "react"
import { signIn, auth } from "@/auth"
import { redirect } from "next/navigation"

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await auth()
  const sp = await searchParams

  // 이미 로그인돼 있으면 곧장 원래 위치로
  if (session?.user) {
    redirect(sp.callbackUrl ?? "/")
  }

  const errorMessage = (() => {
    if (!sp.error) return null
    if (sp.error === "AccessDenied")
      return "@plabfootball.com 계정만 접근 가능합니다."
    return `로그인 오류: ${sp.error}`
  })()

  async function loginAction() {
    "use server"
    await signIn("google", { redirectTo: sp.callbackUrl ?? "/" })
  }

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

        <Suspense>
          <form action={loginAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8.05 6.25C12.55 13.1 17.8 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.14-3.13-.4-4.6H24v9.15h12.6c-.55 2.85-2.15 5.25-4.55 6.85l7.05 5.45c4.1-3.8 6.4-9.4 6.4-15.85z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.65 28.5A14.5 14.5 0 019.5 24c0-1.55.27-3.05.75-4.45L2.2 13.2A24 24 0 000 24c0 3.85.9 7.5 2.5 10.75l8.15-6.25z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.4 0 11.8-2.1 15.7-5.75l-7.05-5.45c-2 1.35-4.55 2.15-8.65 2.15-6.2 0-11.45-3.6-13.35-8.95L2.5 34.75C6.4 42.6 14.6 48 24 48z"
                />
              </svg>
              Google 로 로그인
            </button>
          </form>
        </Suspense>

        <div className="text-center text-[10px] text-neutral-400">
          로그인 시 사용자 이메일과 이름만 저장됩니다.
        </div>
      </div>
    </div>
  )
}
