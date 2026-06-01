"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
import type { BetaAccessJson } from "../../../lib/betaClientAccess"
import { accessFromBetaJson } from "../../../lib/betaClientAccess"
import type { BetaMasteringUiState } from "../../../lib/betaPoints"
import { getStoredBetaEmail, setStoredBetaEmail } from "../../../lib/betaSessionStorage"
import { fetchJsonWithTimeout } from "../../../lib/fetchWithTimeout"
import dynamic from "next/dynamic"

const BETA_PROFILE_FETCH_TIMEOUT_MS = 12_000

/** Routes that need beta session checks — skip profile API on marketing/landing pages. */
const BETA_GATE_ROUTE_PREFIXES = ["/master", "/analyze", "/access", "/flow"] as const

function isBetaGateRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return BETA_GATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

const BetaProfileSlideOver = dynamic(() => import("./BetaProfileSlideOver"), { ssr: false })

function logClientBetaAccess(message: string, detail?: Record<string, unknown>) {
  if (detail) console.log(`[beta-access] ${message}`, detail)
  else console.log(`[beta-access] ${message}`)
}

type BetaMasteringGateContextValue = {
  /** @deprecated Use isBetaUser — kept for existing imports */
  hasAccess: boolean
  isBetaUser: boolean
  /** True when the user is a registered beta member with mastering access. */
  isBeta: boolean
  checking: boolean
  betaUi: BetaMasteringUiState | null
  gateOpen: boolean
  openGate: () => void
  closeGate: () => void
  profilePanelOpen: boolean
  openProfilePanel: () => void
  closeProfilePanel: () => void
  /** Apply profile API JSON immediately (e.g. right after signup POST). */
  applyBetaSession: (json: BetaAccessJson | null | undefined) => boolean
  refreshAccess: (options?: { silent?: boolean }) => Promise<boolean>
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
  const pathname = usePathname()
  const [isBetaUser, setIsBetaUser] = useState(false)
  const [betaUi, setBetaUi] = useState<BetaMasteringUiState | null>(null)
  const [checking, setChecking] = useState(true)
  const [gateOpen, setGateOpen] = useState(false)
  const [profilePanelOpen, setProfilePanelOpen] = useState(false)
  const isBetaUserRef = useRef(false)
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null)

  const applyAccess = useCallback((granted: boolean, ui: BetaMasteringUiState | null) => {
    isBetaUserRef.current = granted
    setIsBetaUser(granted)
    setBetaUi(granted ? ui : null)
  }, [])

  const applyBetaSession = useCallback(
    (json: BetaAccessJson | null | undefined): boolean => {
      if (!accessFromBetaJson(json)) return false
      logClientBetaAccess("beta session applied from API payload", { email: json?.email })
      applyAccess(true, json?.betaUi ?? null)
      setChecking(false)
      return true
    },
    [applyAccess],
  )

  const refreshAccess = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      if (refreshInFlightRef.current) return refreshInFlightRef.current

      const run = async (): Promise<boolean> => {
        if (!options?.silent) setChecking(true)
        try {
          logClientBetaAccess("refreshAccess: GET /api/beta/profile")
          const { res, json } = await fetchJsonWithTimeout<BetaAccessJson>("/api/beta/profile", {
            cache: "no-store",
            credentials: "include",
            timeoutMs: BETA_PROFILE_FETCH_TIMEOUT_MS,
          })
          logClientBetaAccess("refreshAccess: profile response", { status: res.status, ok: res.ok })

          if (accessFromBetaJson(json)) {
            logClientBetaAccess("beta access granted", { source: "profile-api", email: json?.email })
            if (json?.email) setStoredBetaEmail(json.email)
            applyAccess(true, json?.betaUi ?? null)
            return true
          }

          const storedEmail = getStoredBetaEmail()
          if (storedEmail) {
            logClientBetaAccess("restoring session from stored email", { email: storedEmail })
            const { res: resumeRes, json: resumeJson } = await fetchJsonWithTimeout<BetaAccessJson>(
              "/api/beta/profile/resume",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: storedEmail }),
                timeoutMs: BETA_PROFILE_FETCH_TIMEOUT_MS,
              },
            )
            logClientBetaAccess("refreshAccess: resume response", {
              status: resumeRes.status,
              ok: resumeRes.ok,
            })
            if (accessFromBetaJson(resumeJson)) {
              logClientBetaAccess("beta access granted", { source: "resume", email: resumeJson?.email })
              if (resumeJson?.email) setStoredBetaEmail(resumeJson.email)
              applyAccess(true, resumeJson?.betaUi ?? null)
              return true
            }
          }

          applyAccess(false, null)
          return false
        } catch (err) {
          console.warn("[beta-access] refreshAccess failed", err)
          applyAccess(false, null)
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
    },
    [applyAccess],
  )

  useEffect(() => {
    if (!isBetaGateRoute(pathname)) {
      setChecking(false)
      return
    }
    void refreshAccess()
  }, [refreshAccess, pathname])

  useEffect(() => {
    const onFocus = () => {
      if (!isBetaGateRoute(pathname)) return
      if (isBetaUserRef.current) return
      void refreshAccess({ silent: true })
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshAccess, pathname])

  useEffect(() => {
    if (!isBetaGateRoute(pathname)) return
    if (!pathname?.startsWith("/master")) return
    if (isBetaUserRef.current) return
    const storedEmail = getStoredBetaEmail()
    if (!storedEmail) return
    void refreshAccess({ silent: true })
  }, [pathname, refreshAccess])

  const openGate = useCallback(() => setGateOpen(true), [])
  const closeGate = useCallback(() => setGateOpen(false), [])
  const openProfilePanel = useCallback(() => setProfilePanelOpen(true), [])
  const closeProfilePanel = useCallback(() => setProfilePanelOpen(false), [])

  const ensureBetaAccess = useCallback(async (): Promise<boolean> => {
    if (isBetaUserRef.current || isBetaUser) return true
    if (refreshInFlightRef.current) return refreshInFlightRef.current
    return refreshAccess({ silent: true })
  }, [isBetaUser, refreshAccess])

  const runIfAllowed = useCallback(
    (action: () => void) => {
      if (isBetaUserRef.current || isBetaUser) {
        action()
        return
      }
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
    [isBetaUser, ensureBetaAccess],
  )

  const value = useMemo(
    () => ({
      hasAccess: isBetaUser,
      isBetaUser,
      isBeta: isBetaUser,
      checking,
      betaUi,
      gateOpen,
      openGate,
      closeGate,
      profilePanelOpen,
      openProfilePanel,
      closeProfilePanel,
      applyBetaSession,
      refreshAccess,
      runIfAllowed,
    }),
    [
      isBetaUser,
      checking,
      betaUi,
      gateOpen,
      openGate,
      closeGate,
      profilePanelOpen,
      openProfilePanel,
      closeProfilePanel,
      applyBetaSession,
      refreshAccess,
      runIfAllowed,
    ],
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
                href="/access?mode=join"
                onClick={closeGate}
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.2)] ring-1 ring-white/10 transition hover:brightness-110"
              >
                Join Beta
              </Link>
              <Link
                href="/access"
                onClick={closeGate}
                className="min-h-[40px] text-center text-sm text-violet-200/85 transition hover:text-white"
              >
                Continue with email
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
      {profilePanelOpen ? (
        <BetaProfileSlideOver open={profilePanelOpen} onClose={closeProfilePanel} />
      ) : null}
    </BetaMasteringGateContext.Provider>
  )
}
