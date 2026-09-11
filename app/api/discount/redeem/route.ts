import { NextResponse } from "next/server"
import { redeemFreeDiscountCode } from "../../../../lib/discountCodes"

export async function POST(request: Request) {
  let body: { code?: string; objectKey?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const code = typeof body.code === "string" ? body.code : ""
  const objectKey = typeof body.objectKey === "string" ? body.objectKey.trim() : ""

  const result = await redeemFreeDiscountCode({ rawCode: code, objectKey })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
  }

  return NextResponse.json({
    ok: true,
    paid: true,
    free: true,
    freeOrderId: result.freeOrderId,
    finalLabel: result.discount.finalLabel,
    percentOff: result.discount.percentOff,
  })
}
