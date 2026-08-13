"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function WeekSelector({
  current,
  options,
}: {
  current: string
  options: { key: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("w", e.target.value)
        router.push(`${pathname}?${params.toString()}`)
      }}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
      style={{ minWidth: "180px" }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
