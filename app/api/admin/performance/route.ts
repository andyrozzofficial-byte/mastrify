import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { getDbPerfReport, resetDbPerfReport } from "../../../../lib/supabaseTimed"

export async function GET(request: Request) {
  const auth = await requireAdminApi("/api/admin/performance")
  if (auth.error) return auth.error

  const url = new URL(request.url)
  if (url.searchParams.get("reset") === "1") {
    resetDbPerfReport()
    return NextResponse.json({ ok: true, reset: true })
  }

  return NextResponse.json({ ok: true, report: getDbPerfReport() })
}
