/** Single-master price in USD — keep in sync across UI and Stripe checkout. */
export const MASTER_PRICE_USD = 9

export const MASTER_PRICE_CENTS = 900

export const MASTER_PRICE_CURRENCY = "usd"

export const MASTER_PRODUCT_NAME = "Mastrify master export"

/** Display label for buttons and marketing copy, e.g. "$9.00". */
export const MASTER_PRICE_LABEL = `$${MASTER_PRICE_USD.toFixed(2)}`

export const CHECKOUT_PAID_STORAGE_PREFIX = "mastrify:checkout-paid"

export function computeDiscountedCents(baseCents: number, percentOff: number): number {
  const pct = Math.min(100, Math.max(0, Math.round(percentOff)))
  const discount = Math.round(baseCents * (pct / 100))
  return Math.max(0, baseCents - discount)
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function formatDiscountedPriceLabel(percentOff: number): string {
  return formatUsdFromCents(computeDiscountedCents(MASTER_PRICE_CENTS, percentOff))
}
