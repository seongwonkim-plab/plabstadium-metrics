import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppShell } from "./components/AppShell"

export const metadata: Metadata = {
  title: "플랩 직영구장 지표",
  description: "플랩풋볼 직영사업 운영파트 지표 대시보드",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard 폰트를 preload 로 우선 요청 + 로딩 완료 후 stylesheet 로 승격.
            FOUT (텍스트 깜빡임/흐릿함) 방지. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="min-h-full bg-white text-neutral-900" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
