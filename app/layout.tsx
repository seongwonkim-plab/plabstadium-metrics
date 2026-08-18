import type { Metadata } from "next"
import "./globals.css"
import { AppShell } from "./components/AppShell"

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
