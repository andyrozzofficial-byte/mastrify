"use client"

import Link from "next/link"

type Props = {
  visible: boolean
}

/** Shown in public nav only when admin session cookie is valid. */
export default function AdminShortcut({ visible }: Props) {
  if (!visible) return null

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
