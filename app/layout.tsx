import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "플랩 직영구장 지표",
  description: "플랩풋볼 직영사업 운영파트 지표 대시보드",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="min-h-full bg-white text-neutral-900">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-neutral-200 px-4 py-6">
            <div className="mb-6">
              <div className="text-sm font-semibold">플랩 직영구장 지표</div>
              <div className="text-xs text-neutral-500">운영파트 대시보드</div>
            </div>
            <nav className="space-y-1 text-sm">
              <Link href="/" className="block rounded-md px-3 py-2 hover:bg-neutral-100">월간 대시보드</Link>
              <Link href="/weekly" className="block rounded-md px-3 py-2 hover:bg-neutral-100">주간 대시보드</Link>
              <Link href="/branches" className="block rounded-md px-3 py-2 hover:bg-neutral-100">지점 상세</Link>
            </nav>
          </aside>
          <main className="flex-1 px-8 py-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
