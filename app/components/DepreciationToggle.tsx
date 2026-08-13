"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

// 토글 표시 로직: "감가상각 제외" 토글.
// - 기본값: 감가상각 포함 (toggle off · exclude=false)
// - 토글 켜면 (dep=0) 감가상각 제외
export function DepreciationToggle({ exclude }: { exclude: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (exclude) params.delete("dep")
    else params.set("dep", "0")
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
        exclude
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-neutral-200 bg-white text-neutral-500"
      }`}
      title="감가상각 포함(기본)은 시트 총액과 일치. 제외하면 순수 현금 흐름 기준"
    >
      <span
        className={`inline-block h-3 w-6 rounded-full transition ${
          exclude ? "bg-blue-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition ${
            exclude ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
      감가상각 제외
    </button>
  )
}
