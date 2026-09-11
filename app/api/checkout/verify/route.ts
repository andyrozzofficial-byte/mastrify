import { NextResponse } from "next/server"
import { recordStripeDiscountRedemption } from "../../../../lib/discountCodes"
import { getStripeServer } from "../../../../lib/stripe/server"

export async function GET(request: Request) {
  const stripe = getStripeServer()
  if (!stripe) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")?.trim()
  const objectKey = searchParams.get("object_key")?.trim() ?? ""

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 })
  }
  if (!objectKey) {
    return NextResponse.json({ error: "Missing object_key." }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const metadataKey =
      typeof session.metadata?.objectKey === "string" ? session.metadata.objectKey.trim() : ""

    if (session.payment_status !== "paid") {
      return NextResponse.json({ paid: false, sessionId: session.id })
    }

    if (!metadataKey) {
      return NextResponse.json(
        { paid: false, error: "Checkout session is missing master metadata." },
        { status: 400 },
      )
    }

    if (metadataKey !== objectKey) {
      return NextResponse.json(
        { paid: false, error: "Payment does not match this master." },
        { status: 400 },
      )
    }

    const promoCode =
      typeof session.metadata?.promoCode === "string" ? session.metadata.promoCode.trim() : ""
    const finalCentsRaw =
      typeof session.metadata?.finalCents === "string" ? Number(session.metadata.finalCents) : NaN
    const finalCents = Number.isFinite(finalCentsRaw) ? finalCentsRaw : session.amount_total ?? 900

    if (promoCode) {
      await recordStripeDiscountRedemption({
        rawCode: promoCode,
        objectKey,
        stripeSessionId: session.id,
        finalAmountCents: finalCents,
        email: session.customer_details?.email ?? null,
      })
    }

    return NextResponse.json({
      paid: true,
      email: session.customer_details?.email ?? null,
      sessionId: session.id,
    })
  } catch (err) {
    console.error("[checkout/verify]", err)
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 })
  }
}
