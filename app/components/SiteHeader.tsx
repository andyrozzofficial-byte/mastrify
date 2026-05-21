"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import "./site-header.css"

const links = [
  { href: "/analyze", label: "Analyze", short: "Analyze" },
  { href: "/master", label: "Master", short: "Master" },
  { href: "/how-it-works", label: "Why Mastrify", short: "Why" },
  { href: "/pricing", label: "Pricing", short: "Pricing" },
] as const

const navCtaClass =
  "site-header-cta inline-flex shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[13px] font-semibold leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"

export default function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`site-header site-overflow-guard sticky top-0 z-[100] pt-[max(0px,env(safe-area-inset-top))] transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ease-out backdrop-blur-2xl backdrop-saturate-150 md:duration-200 ${
        scrolled
          ? "border-b border-white/[0.11] bg-black/82 shadow-[0_1px_0_rgba(255,255,255,0.07),0_12px_40px_rgba(0,0,0,0.5),0_4px_24px_rgba(0,0,0,0.35)] max-md:backdrop-blur-3xl"
          : "border-b border-white/[0.06] bg-black/58 shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_20px_rgba(0,0,0,0.28)]"
      }`}
    >
      <div className="site-header-inner mx-auto w-full max-w-[1240px] min-w-0">
        {/* Mobile: logo + compact CTA, then nav row */}
        <div className="site-header-mobile md:hidden">
          <div className="site-header-mobile-top flex min-w-0 items-center justify-between gap-2 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] min-[430px]:px-[max(0.875rem,env(safe-area-inset-left))] min-[430px]:pr-[max(0.875rem,env(safe-area-inset-right))] sm:gap-3 sm:px-4">
            <Link
              href="/"
              className="site-header-logo min-w-0 shrink bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-[1.02rem] font-extrabold leading-none tracking-tight text-transparent sm:text-lg"
            >
              Mastrify
            </Link>
            <Link
              href="/master"
              className={`${navCtaClass} min-h-[40px] rounded-xl px-3.5 py-2 text-[11px] sm:min-h-[44px] sm:px-5 sm:py-2.5 sm:text-[12px]`}
            >
              Start
            </Link>
          </div>

          <nav
            className="flex min-w-0 items-center justify-between gap-0.5 overflow-hidden border-t border-white/[0.06] px-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))] py-2 min-[430px]:px-[max(0.5rem,env(safe-area-inset-left))] min-[430px]:pr-[max(0.5rem,env(safe-area-inset-right))] sm:gap-1.5 sm:px-4 sm:py-2.5"
            aria-label="Main"
          >
            {links.map(({ href, label, short }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex min-h-[38px] min-w-0 flex-1 items-center justify-center rounded-lg px-1.5 py-2 text-[11px] font-medium leading-none tracking-wide transition active:scale-[0.98] min-[430px]:px-2 sm:min-h-[40px] sm:px-3.5 sm:text-[12px] ${
                    active
                      ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06]"
                      : "text-white/62 hover:bg-white/[0.04] hover:text-white/88"
                  }`}
                >
                  {short}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Desktop: single row — logo | center nav | CTA */}
        <div className="site-header-desktop hidden md:flex md:min-h-[58px] md:items-center md:justify-between md:gap-6 md:px-8 lg:gap-10">
          <Link
            href="/"
            className="site-header-logo shrink-0 bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-xl font-extrabold leading-none tracking-tight text-transparent"
          >
            Mastrify
          </Link>

          <nav
            className="site-header-nav flex min-w-0 flex-1 items-center justify-center gap-6 lg:gap-8"
            aria-label="Main"
          >
            {links.map(({ href, label }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`site-header-nav-link relative inline-flex items-center text-[13px] font-medium leading-none tracking-wide transition hover:text-white/88 ${
                    active ? "text-white" : "text-white/62"
                  }`}
                >
                  {label}
                  {active ? (
                    <span
                      className="pointer-events-none absolute -bottom-[7px] left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_rgba(192,132,252,0.42)]"
                      aria-hidden
                    />
                  ) : null}
                </Link>
              )
            })}
          </nav>

          <Link href="/master" className={navCtaClass}>
            Start mastering
          </Link>
        </div>
      </div>
    </header>
  )
}
