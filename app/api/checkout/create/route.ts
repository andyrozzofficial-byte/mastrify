import { NextResponse } from "next/server"
import {
  MASTER_PRICE_CENTS,
  MASTER_PRICE_CURRENCY,
  MASTER_PRODUCT_NAME,
} from "../../../../lib/pricing"
import { getAppOrigin, getStripeServer } from "../../../../lib/stripe/server"

export async function POST(request: Request) {
  const stripe = getStripeServer()
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Please try again later." },
      { status: 503 },
    )
  }

  let body: { objectKey?: string; trackTitle?: string; returnPath?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const objectKey = typeof body.objectKey === "string" ? body.objectKey.trim() : ""
  const trackTitle = typeof body.trackTitle === "string" ? body.trackTitle.trim() : ""
  const returnPath =
    typeof body.returnPath === "string" && body.returnPath.startsWith("/") && !body.returnPath.startsWith("//")
      ? body.returnPath
      : "/master/result"

  if (!objectKey) {
    return NextResponse.json({ error: "Missing objectKey." }, { status: 400 })
  }

  const origin = getAppOrigin(request)
  const priceId = process.env.STRIPE_PRICE_ID?.trim()
  const lineItems = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: MASTER_PRICE_CURRENCY,
            unit_amount: MASTER_PRICE_CENTS,
            product_data: {
              name: MASTER_PRODUCT_NAME,
              description: trackTitle
                ? `Full-quality WAV export — ${trackTitle}`
                : "Full-quality WAV export",
            },
          },
          quantity: 1,
        },
      ]

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?checkout=canceled`,
      metadata: {
        objectKey,
        trackTitle,
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error("[checkout/create]", err)
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
  }
}
