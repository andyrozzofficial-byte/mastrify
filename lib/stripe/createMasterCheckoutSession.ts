import { NextResponse } from "next/server"
import { validateDiscountCodeInput } from "../discountCodes"
import { resolveCheckoutLineItems } from "./checkoutLineItems"
import { getAppOrigin, getStripeServer } from "./server"

export type CheckoutSessionRequestBody = {
  objectKey?: string
  trackTitle?: string
  returnPath?: string
  promoCode?: string
}

export async function createMasterCheckoutSession(request: Request) {
  const stripe = getStripeServer()
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "Payments are not configured. Add STRIPE_SECRET_KEY to .env.local and restart the dev server."
            : "Payments are not configured yet. Please try again later.",
      },
      { status: 503 },
    )
  }

  let body: CheckoutSessionRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const objectKey = typeof body.objectKey === "string" ? body.objectKey.trim() : ""
  const trackTitle = typeof body.trackTitle === "string" ? body.trackTitle.trim() : ""
  const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim() : ""
  const returnPath =
    typeof body.returnPath === "string" && body.returnPath.startsWith("/") && !body.returnPath.startsWith("//")
      ? body.returnPath
      : "/master/result"

  if (!objectKey) {
    return NextResponse.json({ error: "Missing objectKey." }, { status: 400 })
  }

  let finalCents: number | undefined
  let normalizedPromo: string | undefined
  let percentOff: number | undefined

  if (promoCode) {
    const validated = await validateDiscountCodeInput(promoCode)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    if (validated.discount.isFree) {
      return NextResponse.json(
        {
          error: "This code makes your master free. Use Apply code, then continue without Stripe checkout.",
          isFree: true,
        },
        { status: 400 },
      )
    }
    finalCents = validated.discount.finalCents
    normalizedPromo = validated.discount.code
    percentOff = validated.discount.percentOff
  }

  const origin = getAppOrigin(request)
  const lineItems = await resolveCheckoutLineItems(stripe, trackTitle, finalCents)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?checkout=canceled`,
      metadata: {
        objectKey,
        trackTitle,
        ...(normalizedPromo
          ? {
              promoCode: normalizedPromo,
              percentOff: String(percentOff ?? ""),
              finalCents: String(finalCents ?? ""),
            }
          : {}),
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      finalCents,
      finalLabel: finalCents != null ? `$${(finalCents / 100).toFixed(2)}` : undefined,
    })
  } catch (err) {
    const stripeMessage = err instanceof Error ? err.message : String(err)
    console.error("[checkout/session]", stripeMessage, err)
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
  }
}
