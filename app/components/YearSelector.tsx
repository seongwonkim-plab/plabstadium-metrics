"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function YearSelector({
  year,
  years,
}: {
  year: number
  years: number[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (
    <select
      value={year}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("y", e.target.value)
        router.push(`${pathname}?${params.toString()}`)
      }}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}년
        </option>
      ))}
    </select>
  )
}
