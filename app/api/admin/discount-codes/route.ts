import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import {
  createDiscountCode,
  deleteDiscountCode,
  fetchAllDiscountCodes,
  updateDiscountCode,
} from "../../../../lib/discountCodes"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/discount-codes")
  if (auth.error) return auth.error

  const data = await fetchAllDiscountCodes()
  if ("error" in data) {
    return NextResponse.json({ error: data.error, rows: [] }, { status: 503 })
  }
  return NextResponse.json({ rows: data })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi("/api/admin/discount-codes")
  if (auth.error) return auth.error

  let body: {
    code?: string
    percentOff?: number
    active?: boolean
    validFrom?: string | null
    validUntil?: string | null
    maxUses?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const result = await createDiscountCode({
    code: typeof body.code === "string" ? body.code : "",
    percentOff: typeof body.percentOff === "number" ? body.percentOff : NaN,
    active: body.active,
    validFrom: body.validFrom ?? null,
    validUntil: body.validUntil ?? null,
    maxUses: body.maxUses ?? null,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ row: result.row })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi("/api/admin/discount-codes")
  if (auth.error) return auth.error

  let body: {
    id?: string
    active?: boolean
    percentOff?: number
    validFrom?: string | null
    validUntil?: string | null
    maxUses?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const result = await updateDiscountCode(id, {
    active: body.active,
    percentOff: typeof body.percentOff === "number" ? body.percentOff : undefined,
    validFrom: body.validFrom,
    validUntil: body.validUntil,
    maxUses: body.maxUses,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ row: result.row })
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi("/api/admin/discount-codes")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim() ?? ""
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const result = await deleteDiscountCode(id)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
