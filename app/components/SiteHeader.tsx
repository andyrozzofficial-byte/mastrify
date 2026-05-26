"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import AdminShortcut from "./AdminShortcut"
import GatedMasterNavLink from "./beta/GatedMasterNavLink"
import JoinBetaNavLink from "./beta/JoinBetaNavLink"
import MobileNavMenu from "./MobileNavMenu"
import { useAdminNavSession } from "./useAdminNavSession"
import "./site-header.css"

type NavLink = {
  href: string
  label: string
  short: string
  gateMastering?: boolean
}

const links: NavLink[] = [
  { href: "/analyze", label: "Analyze", short: "Analyze" },
  { href: "/master", label: "Master", short: "Master", gateMastering: true },
  { href: "/how-it-works", label: "Why Mastrify", short: "Why" },
  { href: "/pricing", label: "Pricing", short: "Pricing" },
]

const navCtaClass =
  "site-header-cta inline-flex shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[13px] font-semibold leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"

type SiteHeaderProps = {
  showAdminNav?: boolean
}

export default function SiteHeader({ showAdminNav = false }: SiteHeaderProps) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const { isAdmin } = useAdminNavSession(showAdminNav)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`site-header site-overflow-guard sticky top-0 z-[100] pt-[max(0px,env(safe-area-inset-top))] transition-[background-color,box-shadow,border-color] duration-300 ease-out max-md:backdrop-blur-md md:backdrop-blur-xl md:backdrop-saturate-150 md:duration-200 ${
        scrolled
          ? "border-b border-white/[0.11] bg-black/82 shadow-[0_1px_0_rgba(255,255,255,0.07),0_12px_40px_rgba(0,0,0,0.5),0_4px_24px_rgba(0,0,0,0.35)] max-md:backdrop-blur-3xl"
          : "border-b border-white/[0.06] bg-black/58 shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_20px_rgba(0,0,0,0.28)]"
      }`}
    >
      <div className="site-header-inner mx-auto w-full max-w-[1240px] min-w-0">
        {/* Mobile: logo + Beta Member CTA + hamburger menu */}
        <MobileNavMenu
          showAdminNav={isAdmin}
          links={links.map(({ href, label, gateMastering }) => ({ href, label, gateMastering }))}
        />

        {/* Desktop: single row — logo | center nav | utilities + main CTA */}
        <div className="site-header-desktop hidden md:flex md:min-h-[58px] md:items-center md:justify-between md:gap-6 md:px-8 lg:gap-10">
          <Link
            href="/"
            className="site-header-logo shrink-0 bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-xl font-extrabold leading-none tracking-tight text-transparent"
          >
            Mastrify
          </Link>

          <nav
            className="site-header-nav flex min-w-0 flex-1 items-center justify-center gap-5 lg:gap-7"
            aria-label="Main"
          >
            {links.map(({ href, label, gateMastering }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`)
              const className = `site-header-nav-link relative inline-flex items-center text-[13px] font-medium leading-none tracking-wide transition hover:text-white/88 ${
                active ? "text-white" : "text-white/62"
              }`
              const link = gateMastering ? (
                <GatedMasterNavLink href={href} gateMastering className={className}>
                  {label}
                </GatedMasterNavLink>
              ) : (
                <Link href={href} className={className}>
                  {label}
                </Link>
              )
              return (
                <span key={href} className="relative">
                  {link}
                  {active ? (
                    <span
                      className="pointer-events-none absolute -bottom-[7px] left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_rgba(192,132,252,0.42)]"
                      aria-hidden
                    />
                  ) : null}
                </span>
              )
            })}
            <JoinBetaNavLink />
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <AdminShortcut visible={isAdmin} />
            <Link
              href="/login"
              className="text-[12px] font-medium text-white/45 transition hover:text-white/75"
            >
              Login
            </Link>
            <GatedMasterNavLink href="/master" gateMastering className={navCtaClass}>
              Start mastering
            </GatedMasterNavLink>
          </div>
        </div>
      </div>
    </header>
  )
}
