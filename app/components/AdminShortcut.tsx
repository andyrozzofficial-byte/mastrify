"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

/** Shown in public nav only when admin session cookie is valid. */
export default function AdminShortcut() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    void fetch("/api/admin/me", { cache: "no-store" })
      .then((res) => setShow(res.ok))
      .catch(() => setShow(false))
  }, [])

  if (!show) return null

  return (
    <Link
      href="/admin"
      className="text-[11px] font-medium text-white/30 transition hover:text-white/55 md:text-xs"
      title="Admin dashboard"
    >
      Admin
    </Link>
  )
}
