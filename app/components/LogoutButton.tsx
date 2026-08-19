"use client"

import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
    >
      로그아웃
    </button>
  )
}
