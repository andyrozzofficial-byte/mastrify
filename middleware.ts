import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  const pathname = url.pathname

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

  // ✅ Tillåt sidor
if (
  pathname === "/" ||
  pathname.startsWith("/flow") ||
  pathname.startsWith("/analyze") ||
  pathname.startsWith("/pro") ||   // 👈 LÄGG TILL DENNA
  pathname === "/app" ||
  pathname === "/landing"
) {
    return NextResponse.next()
  }

  // ✅ Static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // 🚫 Allt annat → landing
  url.pathname = "/landing"
  return NextResponse.redirect(url)
}