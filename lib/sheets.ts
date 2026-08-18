import { google, sheets_v4 } from "googleapis"
import path from "node:path"

let cachedClient: sheets_v4.Sheets | null = null

function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient
  const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH

  let auth: InstanceType<typeof google.auth.GoogleAuth>
  if (jsonEnv) {
    // 배포 환경 (Vercel 등): 서비스 계정 JSON 을 통째로 환경변수에 저장.
    // Vercel single-line paste 시 private_key 의 실제 개행이 \n 문자열로 이스케이프됨 → 복원.
    const credentials = JSON.parse(jsonEnv) as { private_key?: string }
    if (typeof credentials.private_key === "string") {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n")
    }
    auth = new google.auth.GoogleAuth({ credentials, scopes })
  } else if (keyPath) {
    auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(process.cwd(), keyPath),
      scopes,
    })
  } else {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON (배포) 또는 GOOGLE_SERVICE_ACCOUNT_KEY_PATH (로컬) 중 하나는 설정되어야 합니다.",
    )
  }

  cachedClient = google.sheets({ version: "v4", auth })
  return cachedClient
}

export async function readSheetRange(range: string): Promise<unknown[][]> {
  const sheetsId = process.env.GOOGLE_SHEETS_ID
  if (!sheetsId) throw new Error("GOOGLE_SHEETS_ID is not set")
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  })
  return (res.data.values ?? []) as unknown[][]
}
