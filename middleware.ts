import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function isAdminBypass(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  )
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  if (isAdminBypass(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/audio")) {
    return NextResponse.next()
  }

  if (url.searchParams.get("dev") === "true") {
    return NextResponse.next()
  }

  if (url.searchParams.get("from") === "flow") {
    return NextResponse.next()
  }

  if (pathname === "/access" || pathname.startsWith("/access/")) {
    url.pathname = "/master"
    url.search = ""
    return NextResponse.redirect(url)
  }

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
    pathname.startsWith("/api/checkout")
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/audio") ||
    pathname.startsWith("/og-image")
  ) {
    return NextResponse.next()
  }

  url.pathname = "/landing"
  return NextResponse.redirect(url)
}
