"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import AdminShortcut from "./AdminShortcut"
import GatedMasterNavLink from "./beta/GatedMasterNavLink"
import JoinBetaNavLink from "./beta/JoinBetaNavLink"

export type MobileNavLinkItem = {
  href: string
  label: string
  gateMastering?: boolean
}

type Props = {
  links: MobileNavLinkItem[]
  showAdminNav?: boolean
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <>
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  )
}

export default function MobileNavMenu({ links, showAdminNav = false }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="md:hidden">
      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/[0.06] px-[max(1rem,env(safe-area-inset-left))] py-2.5 pr-[max(1rem,env(safe-area-inset-right))]">
        <Link
          href="/"
          className="site-header-logo min-w-0 shrink bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-[1.02rem] font-extrabold leading-none tracking-tight text-transparent sm:text-lg"
        >
          Mastrify
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <JoinBetaNavLink compact />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav-panel"
          aria-label="Main"
          className="border-t border-white/[0.08] bg-black/95 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
        >
          <ul className="flex flex-col gap-1">
            {links.map(({ href, label, gateMastering }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`)
              const className = `flex min-h-[44px] items-center rounded-xl px-3.5 text-[14px] font-medium transition active:scale-[0.99] ${
                active
                  ? "bg-white/[0.09] text-white ring-1 ring-white/[0.06]"
                  : "text-white/72 hover:bg-white/[0.04] hover:text-white"
              }`
              return (
                <li key={href}>
                  {gateMastering ? (
                    <GatedMasterNavLink href={href} gateMastering className={className}>
                      {label}
                    </GatedMasterNavLink>
                  ) : (
                    <Link href={href} className={className} onClick={() => setOpen(false)}>
                      {label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3">
            <AdminShortcut visible={showAdminNav} />
            <Link
              href="/login"
              className="text-[13px] font-medium text-white/50 transition hover:text-white/78"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
