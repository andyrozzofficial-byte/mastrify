"use client"

import { useEffect, useState } from "react"
import type { AdminRole } from "../../../lib/adminRoles"
import { AdminPageHeader } from "../../components/admin/admin-shared"

type SettingsPayload = {
  role: AdminRole
  gateEnabled: boolean
  defaultRole: AdminRole
  features: { betaFeedback: boolean; serviceRole: boolean }
  migrations: string[]
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/settings", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load settings")
        return
      }
      setData(json as SettingsPayload)
    })()
  }, [])

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!data) return <p className="text-sm text-white/50">Loading settings…</p>

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        subtitle="Roles, environment, and database migrations (owner only)."
      />

      <div className="space-y-4">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Your session</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">Role</dt>
              <dd className="font-medium capitalize text-violet-200">{data.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">Admin gate</dt>
              <dd className="text-white/80">{data.gateEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-white/45">
            Set <code className="text-violet-200/90">MASTRIFY_ADMIN_ROLE</code> to{" "}
            <code className="text-violet-200/90">owner</code>, <code className="text-violet-200/90">admin</code>, or{" "}
            <code className="text-violet-200/90">support</code> before sign-in. Default: {data.defaultRole}.
          </p>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Role permissions</h2>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            <li>
              <span className="text-white/85">Owner</span> — full access including Settings
            </li>
            <li>
              <span className="text-white/85">Admin</span> — dashboard, feedback, support, customers, analytics, jobs
            </li>
            <li>
              <span className="text-white/85">Support</span> — dashboard, feedback, support, customers (no analytics/jobs/settings)
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Features</h2>
          <ul className="mt-3 space-y-1 text-sm text-white/70">
            <li>Beta feedback: {data.features.betaFeedback ? "on" : "off"}</li>
            <li>Supabase service role: {data.features.serviceRole ? "configured" : "missing"}</li>
          </ul>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Supabase migrations</h2>
          <p className="mt-2 text-xs text-white/50">Run in SQL Editor (in order):</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-violet-200/80">
            {data.migrations.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
