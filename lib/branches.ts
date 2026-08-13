export type BranchStatus = "open" | "closed" | "paused"

export type Branch = {
  sheetName: string
  displayName: string
  groupId: number
  status: BranchStatus
  note?: string
}

export const BRANCHES: Branch[] = [
  { sheetName: "플랩수원", displayName: "수원", groupId: 119, status: "open" },
  { sheetName: "플랩별내", displayName: "별내", groupId: 156, status: "open" },
  { sheetName: "플랩여주", displayName: "여주", groupId: 157, status: "open" },
  { sheetName: "플랩가산", displayName: "마리오", groupId: 235, status: "open" },
  { sheetName: "플랩안산", displayName: "안산 고잔", groupId: 3433, status: "open" },
  { sheetName: "플랩구미", displayName: "구미", groupId: 3497, status: "open" },
  { sheetName: "플랩디엠", displayName: "디지털엠파이어", groupId: 3540, status: "open" },
  { sheetName: "인천남동", displayName: "인천 남동", groupId: 3620, status: "open" },
  { sheetName: "가산코오롱", displayName: "코오롱테크노밸리", groupId: 3639, status: "open" },
  { sheetName: "가산리더스", displayName: "삼성리더스타워", groupId: 3648, status: "paused", note: "복귀 예정" },
  { sheetName: "가산벽산", displayName: "벽산 6차", groupId: 3957, status: "open" },
  { sheetName: "가산대륭", displayName: "대륭테크노타운 17차", groupId: 4087, status: "open", note: "2026-08 오픈 · 시트 표기 확인 필요" },
  { sheetName: "플랩가좌", displayName: "가좌", groupId: 155, status: "closed", note: "2026-06-02 종료" },
  { sheetName: "플랩시흥", displayName: "시흥", groupId: 3408, status: "closed", note: "2025-06-05 폐점" },
  { sheetName: "플랩부산", displayName: "부산 주례", groupId: 3501, status: "closed", note: "2026-01-31 종료" },
]

export const OPEN_BRANCHES = BRANCHES.filter((b) => b.status === "open")

export function branchBySheetName(name: string): Branch | undefined {
  return BRANCHES.find((b) => b.sheetName === name)
}

export function branchByGroupId(groupId: number): Branch | undefined {
  return BRANCHES.find((b) => b.groupId === groupId)
}
