import { isAdminGateEnabled } from "./admin"
import { isRequestAdmin } from "./requireAdmin"
import { NextResponse } from "next/server"

export async function requireAdminApi() {
  if (!isAdminGateEnabled()) {
    return {
      error: NextResponse.json(
        { error: "Admin access is not configured. Set MASTRIFY_ADMIN_PASSWORD." },
        { status: 503 },
      ),
    }
  }
  if (!(await isRequestAdmin())) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { error: null as null }
}
