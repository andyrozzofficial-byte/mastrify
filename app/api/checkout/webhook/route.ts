import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getStripeServer } from "../../../../lib/stripe/server"

export async function POST(request: Request) {
  const stripe = getStripeServer()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 })
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.error("[checkout/webhook] signature verification failed", err)
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === "paid") {
      console.info("[checkout/webhook] paid", {
        sessionId: session.id,
        objectKey: session.metadata?.objectKey ?? "",
      })
    }
  }

  return NextResponse.json({ received: true })
}
