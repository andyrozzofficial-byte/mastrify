import type { ReactNode } from "react"
import Link from "next/link"

const product = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const

const support = [
  { href: "/how-it-works", label: "FAQ" },
  { href: "mailto:support@mastrify.com", label: "Contact" },
  { href: "#privacy", label: "Privacy" },
] as const

function WaveMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4 12c2-4 4 4 6 0s4 4 6 0 2 4 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SocialPlaceholder({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white/65"
      aria-label={`${label} (coming soon)`}
    >
      {children}
    </button>
  )
}

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-auto border-t border-white/[0.06] bg-black/[0.72] shadow-[0_-1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl backdrop-saturate-150">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,rgba(88,28,135,0.12),transparent_58%),radial-gradient(ellipse_40%_35%_at_90%_30%,rgba(34,211,238,0.05),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1240px] px-5 py-10 md:px-8 md:py-11">
        <span id="privacy" className="sr-only">
          Privacy policy — placeholder anchor for footer Privacy link until a dedicated page exists.
        </span>
        <div className="grid gap-10 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-4 lg:col-span-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <WaveMark className="h-5 w-5 shrink-0 text-purple-400" />
              <span className="text-lg font-bold tracking-tight text-transparent bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text drop-shadow-[0_0_12px_rgba(139,92,246,0.18)]">
                Mastrify
              </span>
            </Link>
            <p className="mt-3 max-w-[16.5rem] text-[12px] leading-relaxed text-white/38 md:text-[13px]">
              AI-powered tools to help producers fix their mixes and release with confidence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-10 md:col-span-4 md:grid-cols-2 lg:col-span-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">Product</p>
              <ul className="mt-3 space-y-2.5">
                {product.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[13px] font-medium text-white/55 transition hover:text-white/90 md:text-sm"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">Support</p>
              <ul className="mt-3 space-y-2.5">
                {support.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] font-medium text-white/55 transition hover:text-white/90 md:text-sm"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="md:col-span-4 lg:col-span-4">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.09] bg-gradient-to-br from-white/[0.06] to-black/[0.55] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(139,92,246,0.06),0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-purple-500/10 md:p-5">
              <div
                className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-purple-500/15 blur-2xl"
                aria-hidden
              />
              <div className="relative max-w-[16rem]">
                <p className="text-[15px] font-semibold leading-snug tracking-tight text-white md:text-base">
                  Ready to master your track?
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/38 md:text-[12px]">
                  Studio-grade AI mastering in minutes — pay only for what you export.
                </p>
                <Link
                  href="/master"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#5b21b6] via-[#4338ca] to-[#0e7490] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(91,33,182,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/10 transition hover:brightness-110 sm:w-auto sm:px-5"
                >
                  Try mastering
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-stretch gap-6 border-t border-white/[0.05] pt-8 md:mt-9 md:flex-row md:items-center md:justify-between md:gap-4 md:pt-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/32">Follow us</p>
            <div className="mt-2.5 flex gap-2">
              <SocialPlaceholder label="Instagram">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="3.5" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </SocialPlaceholder>
              <SocialPlaceholder label="TikTok">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.69V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 011.14.23V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.14-5.1v-7a8.16 8.16 0 004.45 1.33V7.95a5.7 5.7 0 01-4-.26z" />
                </svg>
              </SocialPlaceholder>
              <SocialPlaceholder label="X">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialPlaceholder>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[11px] text-white/28 md:text-xs">© {year} Mastrify. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
