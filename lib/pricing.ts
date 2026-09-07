/** Single-master price in USD — keep in sync across UI and Stripe checkout. */
export const MASTER_PRICE_USD = 7.99

export const MASTER_PRICE_CENTS = 799

export const MASTER_PRICE_CURRENCY = "usd"

export const MASTER_PRODUCT_NAME = "Mastrify master export"

/** Display label for buttons and marketing copy, e.g. "$7.99". */
export const MASTER_PRICE_LABEL = `$${MASTER_PRICE_USD.toFixed(2)}`

export const CHECKOUT_PAID_STORAGE_PREFIX = "mastrify:checkout-paid"
