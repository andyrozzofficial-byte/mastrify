"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/analyze", label: "Analyze", short: "Analyze" },
  { href: "/master", label: "Master", short: "Master" },
  { href: "/how-it-works", label: "Why Mastrify", short: "Why" },
  { href: "/pricing", label: "Pricing", short: "Pricing" },
] as const

const navCtaClass =
  "rounded-lg border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white sm:text-[12px] md:px-4 md:py-2 md:text-[13px]"

export default function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-black/60 pt-[max(0px,env(safe-area-inset-top))] shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex h-11 items-center justify-between gap-3 px-4 sm:h-12 md:h-[58px] md:px-8">
          <Link
            href="/"
            className="shrink-0 bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-lg md:text-xl"
          >
            Mastrify
          </Link>

          <Link href="/master" className={`${navCtaClass} shrink-0 md:hidden`}>
            Start
          </Link>

          <div className="hidden shrink-0 items-center gap-3.5 md:flex">
            <Link href="/master" className="text-[13px] font-medium text-muted-soft transition hover:text-muted-strong">
              Log in
            </Link>
            <Link href="/master" className={navCtaClass}>
              Start mastering
            </Link>
          </div>
        </div>

        <nav
          className="flex items-center gap-0.5 overflow-x-auto border-t border-white/[0.06] px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center md:gap-6 md:border-t-0 md:px-8 md:py-0 lg:gap-8 [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {links.map(({ href, label, short }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`relative shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium tracking-wide transition sm:px-3 sm:text-[12px] md:rounded-none md:bg-transparent md:px-0 md:py-0 md:pb-0.5 md:text-[13px] md:text-sm ${
                  active
                    ? "bg-white/[0.06] text-white md:bg-transparent"
                    : "text-white/68 hover:text-white/88"
                }`}
              >
                {active && (
                  <span className="pointer-events-none absolute -bottom-0.5 left-1/2 hidden h-[2px] w-[calc(100%+8px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_rgba(192,132,252,0.42)] md:block" />
                )}
                <span className="md:hidden">{short}</span>
                <span className="hidden md:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
