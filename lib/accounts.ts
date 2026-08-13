export type AccountCategory =
  | "revenue"
  | "cost_of_sales"
  | "expense"
  | "depreciation"

export type AccountRule = {
  accountTitle: string
  category: AccountCategory
  displayName: string
}

export const ACCOUNT_RULES: AccountRule[] = [
  { accountTitle: "매출", category: "revenue", displayName: "매출" },
  { accountTitle: "매출원가", category: "cost_of_sales", displayName: "매출원가" },
  { accountTitle: "지급임차료", category: "expense", displayName: "지급임차료" },
  { accountTitle: "용역비", category: "expense", displayName: "용역비" },
  { accountTitle: "수도광열비", category: "expense", displayName: "수도광열비" },
  { accountTitle: "통신비", category: "expense", displayName: "통신비" },
  { accountTitle: "소모품비", category: "expense", displayName: "소모품비" },
  { accountTitle: "보험", category: "expense", displayName: "보험" },
  { accountTitle: "자판기", category: "expense", displayName: "자판기 운영비" },
  { accountTitle: "제세동기", category: "expense", displayName: "제세동기" },
  { accountTitle: "지급수수료", category: "expense", displayName: "지급수수료" },
  { accountTitle: "시설장치(감가상각)", category: "depreciation", displayName: "시설장치" },
  { accountTitle: "원상복구(감가상각)", category: "depreciation", displayName: "원상복구" },
  { accountTitle: "영업권(감가상각)", category: "depreciation", displayName: "영업권" },
]

export const REVENUE_DETAIL = {
  SOCIAL: "소셜매출",
  RENTAL: "대관매출",
  VENDING: "자판기매출",
  ACADEMY: "아카데미매출",
} as const

export const SERVICE_DETAIL = {
  MANAGER: "매니저비",
  STAFF: "인건비",
} as const

export function categoryFor(accountTitle: string): AccountCategory | undefined {
  return ACCOUNT_RULES.find((r) => r.accountTitle === accountTitle)?.category
}
