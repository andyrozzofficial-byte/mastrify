import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { ingestDebug, ingestError } from "../../../../lib/adminIngestDebug"
import { fetchBetaIssuesPaginated } from "../../../../lib/betaIssues"
import { parseAdminPage } from "../../../../lib/adminPagination"

export async function GET(request: Request) {
  const auth = await requireAdminApi("/api/admin/issues")
  if (auth.error) {
    ingestError("GET /api/admin/issues", { stage: "auth", status: 401 })
    return auth.error
  }

  ingestDebug("GET /api/admin/issues", { stage: "auth_ok", role: auth.role })

  const page = parseAdminPage(new URL(request.url).searchParams)
  const data = await fetchBetaIssuesPaginated(page)
  if ("error" in data) {
    ingestError("GET /api/admin/issues", { stage: "query", error: data.error, page })
    return NextResponse.json(
      {
        error: data.error,
        rows: [],
        pagination: { page, pageSize: 0, total: 0, totalPages: 1 },
      },
      { status: 503 },
    )
  }
  return NextResponse.json({
    rows: data.rows,
    pagination: data.pagination,
    count: data.rows.length,
  })
}
