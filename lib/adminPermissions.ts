import { cookies } from "next/headers"
import { verifyAdminToken, getAdminSecret, ADMIN_COOKIE_NAME } from "./admin"
import { ADMIN_ROLE_COOKIE, defaultAdminRole, isAdminRole, type AdminRole } from "./adminRoles"

export async function getAdminSession(): Promise<{ authenticated: boolean; role: AdminRole }> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  const ok = await verifyAdminToken(token, getAdminSecret())
  if (!ok) return { authenticated: false, role: defaultAdminRole() }

  const roleRaw = cookieStore.get(ADMIN_ROLE_COOKIE)?.value
  const role = roleRaw && isAdminRole(roleRaw) ? roleRaw : defaultAdminRole()
  return { authenticated: true, role }
}
