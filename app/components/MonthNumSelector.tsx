"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function MonthNumSelector({ month }: { month: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (
    <select
      value={month}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("m", e.target.value)
        router.push(`${pathname}?${params.toString()}`)
      }}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
    >
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <option key={m} value={m}>
          {m}월
        </option>
      ))}
    </select>
  )
}
