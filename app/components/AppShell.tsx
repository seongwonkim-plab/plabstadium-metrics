import Link from "next/link"
import { StatusIndicator } from "./StatusIndicator"

export function AppShell({ children }: { children: React.ReactNode }) {
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
        </div>
      </aside>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  )
}
