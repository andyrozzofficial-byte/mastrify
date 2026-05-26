import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchBetaIssuesPaginated } from "../../../../lib/betaIssues"
import { parseAdminPage } from "../../../../lib/adminPagination"

export async function GET(request: Request) {
  const auth = await requireAdminApi("/api/admin/issues")
  if (auth.error) return auth.error

  const page = parseAdminPage(new URL(request.url).searchParams)
  const data = await fetchBetaIssuesPaginated(page)
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json({ rows: data.rows, pagination: data.pagination })
}
