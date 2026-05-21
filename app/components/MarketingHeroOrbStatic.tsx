"use client"

/**
 * Static marketing orb — no Framer loops, no filter blur, no will-change.
 * Used on the landing page for scroll-safe compositing.
 */
export default function MarketingHeroOrbStatic({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-full max-lg:max-w-[min(11.5rem,calc(100vw-2.5rem))] lg:w-[min(20rem,88vw)] lg:max-w-[22rem] xl:max-w-[24rem] ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-[4%] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.22)_0%,rgba(79,70,229,0.06)_48%,transparent_68%)]"
      />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="88" stroke="rgba(167,139,250,0.22)" strokeWidth="0.6" />
        <path
          d="M100 12 A88 88 0 0 1 182 72"
          stroke="rgba(129,140,248,0.55)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke="rgba(167,139,250,0.18)"
          strokeWidth="0.75"
          strokeDasharray="2 12"
        />
      </svg>

      <div className="absolute inset-[18%] flex items-center justify-center">
        <div
          className="relative h-full w-full rounded-full p-[2px]"
          style={{
            background:
              "linear-gradient(145deg, rgba(167,139,250,0.55) 0%, rgba(99,102,241,0.35) 42%, rgba(56,189,248,0.45) 100%)",
            boxShadow: "0 0 48px rgba(139,92,246,0.12), inset 0 0 24px rgba(0,0,0,0.48)",
          }}
        >
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#050508]/96">
            <div
              className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.08)_40deg,transparent_80deg,rgba(125,211,252,0.06)_140deg,transparent_200deg)]"
              aria-hidden
            />
            <svg className="relative z-[1] h-[42%] w-[42%]" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="landingOrbWave" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f5f3ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path
                d="M4 32 C10 18, 16 38, 22 28 S34 16, 40 28"
                stroke="url(#landingOrbWave)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M4 36 C12 28, 20 40, 28 32 S36 24, 40 36"
                stroke="url(#landingOrbWave)"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.45"
              />
            </svg>
            <span className="absolute left-1/2 top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-90" />
          </div>
        </div>
      </div>
    </div>
  )
}
