import { cookies } from "next/headers"
import { verifyAdminToken, getAdminSecret, ADMIN_COOKIE_NAME } from "./admin"
import { ADMIN_ROLE_COOKIE, defaultAdminRole, isAdminRole, type AdminRole } from "./adminRoles"

export async function getAdminSession(): Promise<{ authenticated: boolean; role: AdminRole }> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  const ok = await verifyAdminToken(token, getAdminSecret())
  if (!ok) {
    if (process.env.MASTRIFY_ADMIN_DEBUG === "1") {
      const secret = getAdminSecret()
      console.log("[admin-auth] session rejected", {
        hasCookie: Boolean(token),
        tokenLength: token?.length ?? 0,
        hasSecret: Boolean(secret),
        secretLength: secret.length,
      })
    }
    return { authenticated: false, role: defaultAdminRole() }
  }

  const roleRaw = cookieStore.get(ADMIN_ROLE_COOKIE)?.value
  const role = roleRaw && isAdminRole(roleRaw) ? roleRaw : defaultAdminRole()
  return { authenticated: true, role }
}
