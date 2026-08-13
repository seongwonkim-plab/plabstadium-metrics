import { google, sheets_v4 } from "googleapis"
import path from "node:path"

let cachedClient: sheets_v4.Sheets | null = null

function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  if (!keyPath) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set")
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), keyPath),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
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
