"use client"

import Link from "next/link"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type BetaMasteringGateContextValue = {
  hasAccess: boolean
  checking: boolean
  gateOpen: boolean
  openGate: () => void
  closeGate: () => void
  refreshAccess: () => Promise<void>
  /** Runs callback only when beta mastering access is granted; otherwise opens the gate modal. */
  runIfAllowed: (action: () => void) => void
}

const BetaMasteringGateContext = createContext<BetaMasteringGateContextValue | null>(null)

export function useBetaMasteringGate(): BetaMasteringGateContextValue {
  const ctx = useContext(BetaMasteringGateContext)
  if (!ctx) {
    throw new Error("useBetaMasteringGate must be used within BetaMasteringGateProvider")
  }
  return ctx
}

export function useBetaMasteringGateOptional(): BetaMasteringGateContextValue | null {
  return useContext(BetaMasteringGateContext)
}

export function BetaMasteringGateProvider({ children }: { children: ReactNode }) {
  const [hasAccess, setHasAccess] = useState(false)
  const [checking, setChecking] = useState(true)
  const [gateOpen, setGateOpen] = useState(false)

  const refreshAccess = useCallback(async () => {
    try {
      const res = await fetch("/api/beta/profile", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      setHasAccess(Boolean(json?.hasMasteringAccess))
    } catch {
      setHasAccess(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void refreshAccess()
  }, [refreshAccess])

  const openGate = useCallback(() => setGateOpen(true), [])
  const closeGate = useCallback(() => setGateOpen(false), [])

  const runIfAllowed = useCallback(
    (action: () => void) => {
      if (checking) return
      if (hasAccess) {
        action()
        return
      }
      setGateOpen(true)
    },
    [checking, hasAccess],
  )

  const value = useMemo(
    () => ({
      hasAccess,
      checking,
      gateOpen,
      openGate,
      closeGate,
      refreshAccess,
      runIfAllowed,
    }),
    [hasAccess, checking, gateOpen, openGate, closeGate, refreshAccess, runIfAllowed],
  )

  return (
    <BetaMasteringGateContext.Provider value={value}>
      {children}
      {gateOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="beta-gate-title"
          onClick={closeGate}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#14141a] to-black px-7 py-8 shadow-[0_28px_64px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent"
              aria-hidden
            />
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/70">
              Private beta
            </p>
            <h2 id="beta-gate-title" className="mt-4 text-center text-xl font-semibold text-white">
              Mastering is currently in private beta.
            </h2>
            <p className="mx-auto mt-4 max-w-[18rem] text-center text-sm leading-relaxed text-white/62">
              Mix Analysis is available for everyone, but full mastering access is currently limited while we
              improve the platform.
            </p>
            <p className="mt-3 text-center text-sm text-white/72">Want early access? Join beta.</p>
            <div className="mt-7 flex flex-col gap-2.5">
              <Link
                href="/access"
                onClick={closeGate}
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.2)] ring-1 ring-white/10 transition hover:brightness-110"
              >
                Join Beta
              </Link>
              <button
                type="button"
                onClick={closeGate}
                className="min-h-[40px] text-sm text-white/45 transition hover:text-white/70"
              >
                Continue with Mix Analysis
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BetaMasteringGateContext.Provider>
  )
}
