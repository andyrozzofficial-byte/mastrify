import { cookies } from "next/headers"
import {
  ADMIN_COOKIE_NAME,
  getAdminSecret,
  isAdminGateEnabled,
  verifyAdminToken,
} from "./admin"

export async function isRequestAdmin(): Promise<boolean> {
  if (!isAdminGateEnabled()) return false
  const cookieStore = await cookies()
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value, getAdminSecret())
}
