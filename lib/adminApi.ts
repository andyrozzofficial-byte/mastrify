import { isAdminGateEnabled } from "./admin"
import { getAdminSession } from "./adminPermissions"
import { roleCanAccessApi } from "./adminRoles"
import { NextResponse } from "next/server"

export async function requireAdminApi(apiPath?: string) {
  if (!isAdminGateEnabled()) {
    return {
      error: NextResponse.json(
        { error: "Admin access is not configured. Set MASTRIFY_ADMIN_PASSWORD." },
        { status: 503 },
      ),
    }
  }
  const session = await getAdminSession()
  if (!session.authenticated) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (apiPath && !roleCanAccessApi(session.role, apiPath)) {
    return { error: NextResponse.json({ error: "Forbidden for your role" }, { status: 403 }) }
  }
  return { error: null as null, role: session.role }
}
