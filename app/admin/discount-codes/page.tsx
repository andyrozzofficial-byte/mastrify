"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DiscountCodeRow } from "../../../lib/discountCodes"
import {
  ADMIN_BUTTON_PRIMARY,
  AdminEmpty,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileField,
  AdminPageHeader,
  AdminSearchInput,
  AdminTable,
  formatAdminDate,
} from "../../components/admin/admin-shared"

type FormState = {
  code: string
  percentOff: string
  active: boolean
  validFrom: string
  validUntil: string
  maxUses: string
}

const emptyForm = (): FormState => ({
  code: "",
  percentOff: "100",
  active: true,
  validFrom: "",
  validUntil: "",
  maxUses: "",
})

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ""
  }
}

function fromDatetimeLocal(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function usageLabel(row: DiscountCodeRow): string {
  if (row.max_uses == null) return `${row.use_count} / ∞`
  return `${row.use_count} / ${row.max_uses}`
}

function statusLabel(row: DiscountCodeRow): { text: string; className: string } {
  if (!row.active) return { text: "Inactive", className: "bg-white/[0.06] text-white/50 ring-white/10" }
  const now = new Date()
  if (row.valid_from) {
    const from = new Date(row.valid_from)
    if (!Number.isNaN(from.getTime()) && now < from) {
      return { text: "Scheduled", className: "bg-sky-500/15 text-sky-200 ring-sky-400/25" }
    }
  }
  if (row.valid_until) {
    const until = new Date(row.valid_until)
    if (!Number.isNaN(until.getTime()) && now > until) {
      return { text: "Expired", className: "bg-rose-500/15 text-rose-200 ring-rose-400/25" }
    }
  }
  if (row.max_uses != null && row.use_count >= row.max_uses) {
    return { text: "Limit reached", className: "bg-amber-500/15 text-amber-100 ring-amber-400/25" }
  }
  return { text: "Active", className: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25" }
}

export default function AdminDiscountCodesPage() {
  const [rows, setRows] = useState<DiscountCodeRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    const res = await fetch("/api/admin/discount-codes", { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Could not load discount codes")
      return
    }
    setError(null)
    setRows((json?.rows ?? []) as DiscountCodeRow[])
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.code.toLowerCase().includes(q))
  }, [rows, search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const percentOff = Number(form.percentOff)
    if (!form.code.trim()) {
      setFormError("Code is required.")
      return
    }
    if (!Number.isFinite(percentOff) || percentOff < 0 || percentOff > 100) {
      setFormError("Percent must be between 0 and 100.")
      return
    }

    setCreating(true)
    const maxUsesRaw = form.maxUses.trim()
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null
    if (maxUsesRaw && (!Number.isFinite(maxUses) || maxUses! < 1)) {
      setFormError("Max uses must be a positive number.")
      setCreating(false)
      return
    }

    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code.trim(),
        percentOff,
        active: form.active,
        validFrom: fromDatetimeLocal(form.validFrom),
        validUntil: fromDatetimeLocal(form.validUntil),
        maxUses,
      }),
    })
    const json = await res.json().catch(() => null)
    setCreating(false)
    if (!res.ok) {
      setFormError(json?.error ?? "Could not create code")
      return
    }
    setForm(emptyForm())
    await loadRows()
  }

  const toggleActive = async (row: DiscountCodeRow) => {
    setBusyId(row.id)
    const res = await fetch("/api/admin/discount-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, active: !row.active }),
    })
    setBusyId(null)
    if (res.ok) await loadRows()
  }

  const deleteCode = async (row: DiscountCodeRow) => {
    if (!window.confirm(`Delete code ${row.code}? This cannot be undone.`)) return
    setBusyId(row.id)
    const res = await fetch(`/api/admin/discount-codes?id=${encodeURIComponent(row.id)}`, { method: "DELETE" })
    setBusyId(null)
    if (res.ok) await loadRows()
  }

  return (
    <div>
      <AdminPageHeader
        title="Discount Codes"
        subtitle="Create and manage promo codes for master export checkout. 100% codes skip Stripe and unlock free delivery."
      />

      <form onSubmit={(e) => void handleCreate(e)} className="mb-8 rounded-2xl border border-white/[0.12] bg-white/[0.04] p-6">
        <h2 className="text-[15px] font-semibold text-white">Create code</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/50">Code</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="ANDYFREE"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm uppercase text-white outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/50">Percent off</span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.percentOff}
              onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value }))}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/50">Max uses (optional)</span>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              placeholder="Unlimited"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/50">Valid from (optional)</span>
            <input
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/50">Valid until (optional)</span>
            <input
              type="datetime-local"
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20"
            />
            <span className="text-sm text-white/70">Active immediately</span>
          </label>
        </div>
        {formError ? <p className="mt-3 text-sm text-rose-300/90">{formError}</p> : null}
        <button type="submit" disabled={creating} className={`mt-4 ${ADMIN_BUTTON_PRIMARY}`}>
          {creating ? "Creating…" : "Create discount code"}
        </button>
      </form>

      <div className="mb-4">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search codes…" />
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No discount codes yet." />
      ) : (
        <>
          <AdminTable>
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-[11px] font-medium uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-3 py-2.5">Off</th>
                <th className="px-3 py-2.5">Uses</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Valid</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const status = statusLabel(row)
                return (
                  <tr key={row.id} className="border-t border-white/[0.06] transition hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-white">{row.code}</td>
                    <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{row.percent_off}%</td>
                    <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{usageLabel(row)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white/55">
                      {row.valid_from || row.valid_until ? (
                        <>
                          {row.valid_from ? formatAdminDate(row.valid_from) : "—"}
                          {" → "}
                          {row.valid_until ? formatAdminDate(row.valid_until) : "—"}
                        </>
                      ) : (
                        "Always"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white/55">{formatAdminDate(row.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void toggleActive(row)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${ADMIN_BUTTON_PRIMARY}`}
                        >
                          {row.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void deleteCode(row)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${ADMIN_BUTTON_PRIMARY}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminTable>

          <AdminMobileCardList>
            {filtered.map((row) => {
              const status = statusLabel(row)
              return (
                <AdminMobileCard key={row.id}>
                  <p className="font-mono text-base font-semibold text-white">{row.code}</p>
                  <AdminMobileField label="Off">{row.percent_off}%</AdminMobileField>
                  <AdminMobileField label="Uses">{usageLabel(row)}</AdminMobileField>
                  <AdminMobileField label="Status">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.className}`}>
                      {status.text}
                    </span>
                  </AdminMobileField>
                  <AdminMobileField label="Valid">
                    {row.valid_from || row.valid_until
                      ? `${row.valid_from ? formatAdminDate(row.valid_from) : "—"} → ${row.valid_until ? formatAdminDate(row.valid_until) : "—"}`
                      : "Always"}
                  </AdminMobileField>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void toggleActive(row)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${ADMIN_BUTTON_PRIMARY}`}
                    >
                      {row.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void deleteCode(row)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${ADMIN_BUTTON_PRIMARY}`}
                    >
                      Delete
                    </button>
                  </div>
                </AdminMobileCard>
              )
            })}
          </AdminMobileCardList>
        </>
      )}
    </div>
  )
}
