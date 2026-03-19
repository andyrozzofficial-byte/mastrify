import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // 🔓 DEV MODE → du ser allt
  if (url.searchParams.get("dev") === "true") {
    return NextResponse.next()
  }

  // ✅ Tillåt landing
  if (url.pathname === "/landing") {
    return NextResponse.next()
  }

  // ✅ Tillåt assets
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // 🚫 ALLT annat → landing
  url.pathname = "/landing"
  return NextResponse.redirect(url)
}