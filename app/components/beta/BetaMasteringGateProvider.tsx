"use client"

import Link from "next/link"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getStoredBetaEmail } from "../../../lib/betaSessionStorage"

type BetaAccessJson = {
  isBetaUser?: boolean
  hasMasteringAccess?: boolean
  complete?: boolean
  email?: string | null
}

function logClientBetaAccess(message: string, detail?: Record<string, unknown>) {
  if (detail) console.log(`[beta-access] ${message}`, detail)
  else console.log(`[beta-access] ${message}`)
}

function accessFromJson(json: BetaAccessJson | null): boolean {
  return Boolean(json?.isBetaUser ?? json?.hasMasteringAccess)
}

type BetaMasteringGateContextValue = {
  /** @deprecated Use isBetaUser — kept for existing imports */
  hasAccess: boolean
  isBetaUser: boolean
  checking: boolean
  gateOpen: boolean
  openGate: () => void
  closeGate: () => void
  refreshAccess: () => Promise<boolean>
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
  const [isBetaUser, setIsBetaUser] = useState(false)
  const [checking, setChecking] = useState(true)
  const [gateOpen, setGateOpen] = useState(false)
  const isBetaUserRef = useRef(false)
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null)

  const applyAccess = useCallback((granted: boolean) => {
    isBetaUserRef.current = granted
    setIsBetaUser(granted)
  }, [])

  const refreshAccess = useCallback(async (): Promise<boolean> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current

    const run = async (): Promise<boolean> => {
      setChecking(true)
      try {
        const res = await fetch("/api/beta/profile", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as BetaAccessJson | null

        if (accessFromJson(json)) {
          logClientBetaAccess("beta access granted", { source: "profile-api", email: json?.email })
          applyAccess(true)
          return true
        }

        const storedEmail = getStoredBetaEmail()
        if (storedEmail) {
          logClientBetaAccess("restoring session from stored email", { email: storedEmail })
          const resumeRes = await fetch("/api/beta/profile/resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: storedEmail }),
          })
          const resumeJson = (await resumeRes.json().catch(() => null)) as BetaAccessJson | null
          if (accessFromJson(resumeJson) || resumeJson?.complete) {
            logClientBetaAccess("beta access granted", { source: "resume", email: resumeJson?.email })
            applyAccess(true)
            return true
          }
        }

        applyAccess(false)
        return false
      } catch {
        applyAccess(false)
        return false
      } finally {
        setChecking(false)
      }
    }

    const promise = run()
    refreshInFlightRef.current = promise
    try {
      return await promise
    } finally {
      refreshInFlightRef.current = null
    }
  }, [applyAccess])

  useEffect(() => {
    void refreshAccess()
  }, [refreshAccess])

  const openGate = useCallback(() => setGateOpen(true), [])
  const closeGate = useCallback(() => setGateOpen(false), [])

  const ensureBetaAccess = useCallback(async (): Promise<boolean> => {
    if (isBetaUserRef.current) return true
    if (refreshInFlightRef.current) return refreshInFlightRef.current
    return refreshAccess()
  }, [refreshAccess])

  const runIfAllowed = useCallback(
    (action: () => void) => {
      void (async () => {
        const allowed = await ensureBetaAccess()
        if (allowed) {
          action()
          return
        }
        logClientBetaAccess("beta access denied — showing gate")
        setGateOpen(true)
      })()
    },
    [ensureBetaAccess],
  )

  const value = useMemo(
    () => ({
      hasAccess: isBetaUser,
      isBetaUser,
      checking,
      gateOpen,
      openGate,
      closeGate,
      refreshAccess,
      runIfAllowed,
    }),
    [isBetaUser, checking, gateOpen, openGate, closeGate, refreshAccess, runIfAllowed],
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
