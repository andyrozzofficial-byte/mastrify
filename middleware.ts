import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  ACCESS_COOKIE_NAME,
  getAccessSecret,
  isAccessBypassPath,
  isAccessGateEnabled,
  isProtectedPath,
  safeAccessRedirect,
  verifyAccessToken,
} from "./lib/access"
import {
  ADMIN_COOKIE_NAME,
  getAdminSecret,
  isAdminApiPath,
  isAdminPath,
  verifyAdminToken,
} from "./lib/admin"
import { ADMIN_ROLE_COOKIE, isAdminRole, roleCanAccessPath } from "./lib/adminRoles"

/** Admin UI, admin API, and beta-feedback API — never redirect to /landing. */
function isAdminOrFeedbackApiBypass(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  return (
    path.startsWith("/admin") ||
    path.startsWith("/api/admin") ||
    path === "/api/beta-feedback"
  )
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  if (isAdminOrFeedbackApiBypass(pathname)) {
    const normalized =
      pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname

    if (
      normalized !== "/api/admin/auth" &&
      (isAdminPath(normalized) || isAdminApiPath(normalized))
    ) {
      const adminOk = await verifyAdminToken(
        request.cookies.get(ADMIN_COOKIE_NAME)?.value,
        getAdminSecret(),
      )
      if (adminOk) {
        const roleRaw = request.cookies.get(ADMIN_ROLE_COOKIE)?.value
        const role = roleRaw && isAdminRole(roleRaw) ? roleRaw : "owner"
        if (!roleCanAccessPath(role, normalized)) {
          if (isAdminApiPath(normalized)) {
            return NextResponse.json({ error: "Forbidden for your role" }, { status: 403 })
          }
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = "/admin"
          redirectUrl.search = ""
          return NextResponse.redirect(redirectUrl)
        }
      }
    }

    return NextResponse.next()
  }

  // 🔥 SKIP AUDIO FILES (DETTA ÄR FIXEN)
  if (pathname.startsWith("/audio")) {
    return NextResponse.next()
  }

  // 🔓 DEV MODE
  if (url.searchParams.get("dev") === "true") {
    return NextResponse.next()
  }

  // 🔓 Flow bypass
  if (url.searchParams.get("from") === "flow") {
    return NextResponse.next()
  }

  if (isAccessGateEnabled()) {
    const hasAccess = await verifyAccessToken(
      request.cookies.get(ACCESS_COOKIE_NAME)?.value,
      getAccessSecret(),
    )

    if (isAccessBypassPath(pathname)) {
      if (pathname === "/access" && hasAccess) {
        const next = safeAccessRedirect(url.searchParams.get("next"))
        url.pathname = next
        url.search = ""
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    if (isProtectedPath(pathname) && !hasAccess) {
      url.pathname = "/access"
      url.search = ""
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }

  // ✅ Tillåt sidor
  if (
    pathname === "/" ||
    pathname.startsWith("/flow") ||
    pathname.startsWith("/analyze") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/pro") ||
    pathname === "/app" ||
    pathname === "/landing" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/blog") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/contact" ||
    pathname === "/access" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname === "/api/beta-feedback"
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/audio") ||
    pathname.startsWith("/og-image") ||
    pathname.startsWith("/api/access") ||
    pathname.startsWith("/api/admin") ||
    pathname === "/api/beta-feedback"
  ) {
    return NextResponse.next()
  }

  // 🚫 Allt annat → landing
  url.pathname = "/landing"
  return NextResponse.redirect(url)
}
