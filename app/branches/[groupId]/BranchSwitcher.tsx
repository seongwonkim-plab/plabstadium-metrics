"use client"
import { useRouter } from "next/navigation"

export function BranchSwitcher({
  current,
  options,
}: {
  current: number
  options: { groupId: number; label: string }[]
}) {
  const router = useRouter()
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/branches/${e.target.value}`)}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
    >
      {options.map((o) => (
        <option key={o.groupId} value={o.groupId}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
