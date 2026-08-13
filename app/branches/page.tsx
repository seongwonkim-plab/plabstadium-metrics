import { redirect } from "next/navigation"
import { OPEN_BRANCHES } from "@/lib/branches"

export default function BranchesIndex() {
  redirect(`/branches/${OPEN_BRANCHES[0].groupId}`)
}
