import Link from "next/link"
import { StatusIndicator } from "./StatusIndicator"
import { auth, signOut } from "@/auth"
import { headers } from "next/headers"

export async function AppShell({ children }: { children: React.ReactNode }) {
  // /login 은 사이드바 없는 단독 화면 (proxy.ts 가 x-pathname 헤더 심음)
  const h = await headers()
  const pathname = h.get("x-pathname") ?? ""
  if (pathname === "/login") {
    return <>{children}</>
  }

  const session = await auth()

  async function handleSignOut() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 flex flex-col border-r border-neutral-200">
        <div className="flex-1 px-4 py-6">
          <div className="mb-6">
            <div className="text-sm font-semibold">플랩 직영구장 지표</div>
            <div className="text-xs text-neutral-500">운영파트 대시보드</div>
          </div>
          <nav className="space-y-1 text-sm">
            <Link href="/" className="block rounded-md px-3 py-2 hover:bg-neutral-100">
              월간 대시보드
            </Link>
            <Link
              href="/weekly"
              className="block rounded-md px-3 py-2 hover:bg-neutral-100"
            >
              주간 대시보드
            </Link>
            <Link
              href="/branches"
              className="block rounded-md px-3 py-2 hover:bg-neutral-100"
            >
              지점 상세
            </Link>
            <div className="mt-4 mb-1 px-3 pt-2 border-t border-neutral-100 text-[10px] uppercase tracking-wide text-neutral-400">
              문서
            </div>
            <Link
              href="/docs/readme"
              className="block rounded-md px-3 py-2 hover:bg-neutral-100"
            >
              README
            </Link>
            <Link
              href="/docs/task-history"
              className="block rounded-md px-3 py-2 hover:bg-neutral-100"
            >
              작업 이력
            </Link>
            <div className="mt-4 mb-1 px-3 pt-2 border-t border-neutral-100 text-[10px] uppercase tracking-wide text-neutral-400">
              관리
            </div>
            <Link
              href="/admin/freeze"
              className="block rounded-md px-3 py-2 hover:bg-neutral-100"
            >
              Freeze 관리
            </Link>
          </nav>
        </div>
        <div className="border-t border-neutral-200 px-3 py-3">
          <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-neutral-400">
            시스템 상태
          </div>
          <StatusIndicator />

          {session?.user && (
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <div className="px-2 text-[11px] text-neutral-700 truncate" title={session.user.email ?? undefined}>
                {session.user.name || session.user.email}
              </div>
              <div className="mt-0.5 px-2 text-[10px] text-neutral-400 truncate">
                {session.user.email}
              </div>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                >
                  로그아웃
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  )
}
