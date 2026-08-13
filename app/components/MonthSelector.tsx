"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function MonthSelector({
  year,
  month,
  options,
}: {
  year: number
  month: number
  options: { year: number; month: number; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const value = `${year}-${month}`
  return (
    <select
      value={value}
      onChange={(e) => {
        const [y, m] = e.target.value.split("-").map(Number)
        const params = new URLSearchParams(searchParams.toString())
        params.set("y", String(y))
        params.set("m", String(m))
        router.push(`${pathname}?${params.toString()}`)
      }}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
    >
      {options.map((o) => (
        <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
