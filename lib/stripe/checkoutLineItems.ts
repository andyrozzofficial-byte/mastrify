import Stripe from "stripe"
import {
  MASTER_PRICE_CENTS,
  MASTER_PRICE_CURRENCY,
  MASTER_PRODUCT_NAME,
} from "../pricing"

function buildInlinePriceLineItem(
  trackTitle: string,
  unitAmountCents: number = MASTER_PRICE_CENTS,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: MASTER_PRICE_CURRENCY,
      unit_amount: unitAmountCents,
      product_data: {
        name: MASTER_PRODUCT_NAME,
        description: trackTitle
          ? `Full-quality WAV export — ${trackTitle}`
          : "Full-quality WAV export",
      },
    },
    quantity: 1,
  }
}

/** Prefer STRIPE_PRICE_ID when it matches live $9.00 one-time USD pricing; otherwise inline price_data. */
export async function resolveCheckoutLineItems(
  stripe: Stripe,
  trackTitle: string,
  unitAmountCents: number = MASTER_PRICE_CENTS,
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  if (unitAmountCents !== MASTER_PRICE_CENTS) {
    return [buildInlinePriceLineItem(trackTitle, unitAmountCents)]
  }

  const priceId = process.env.STRIPE_PRICE_ID?.trim()
  if (!priceId) {
    return [buildInlinePriceLineItem(trackTitle, unitAmountCents)]
  }

  try {
    const price = await stripe.prices.retrieve(priceId)
    const isValid =
      price.active &&
      price.type === "one_time" &&
      price.currency === MASTER_PRICE_CURRENCY &&
      price.unit_amount === MASTER_PRICE_CENTS

    if (isValid) {
      return [{ price: priceId, quantity: 1 }]
    }

    console.warn("[checkout/create] STRIPE_PRICE_ID does not match $9.00 USD one-time price; using price_data", {
      priceId,
      active: price.active,
      type: price.type,
      currency: price.currency,
      unit_amount: price.unit_amount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn("[checkout/create] STRIPE_PRICE_ID unavailable for this Stripe account; using price_data", {
      priceId,
      message,
    })
  }

  return [buildInlinePriceLineItem(trackTitle)]
}
