import { NextResponse } from "next/server"
import { resolveCheckoutLineItems } from "../../../../lib/stripe/checkoutLineItems"
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
  const lineItems = await resolveCheckoutLineItems(stripe, trackTitle)

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
    const stripeMessage = err instanceof Error ? err.message : String(err)
    console.error("[checkout/create]", stripeMessage, err)
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
  }
}
