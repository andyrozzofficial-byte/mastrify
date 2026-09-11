import { NextResponse } from "next/server"
import { validateDiscountCodeInput } from "../../../../lib/discountCodes"

export async function POST(request: Request) {
  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const code = typeof body.code === "string" ? body.code : ""
  const result = await validateDiscountCodeInput(code)
  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    code: result.discount.code,
    percentOff: result.discount.percentOff,
    originalCents: result.discount.originalCents,
    finalCents: result.discount.finalCents,
    originalLabel: result.discount.originalLabel,
    finalLabel: result.discount.finalLabel,
    isFree: result.discount.isFree,
  })
}
