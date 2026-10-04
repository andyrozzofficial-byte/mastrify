// Byter bara ut betalningskontrollerna (Stripe, gratiskoder) och lägger en spion på leveransmodulen,
// när server/server.js importerar dem. Allt annat i servern är den riktiga koden.
const here = new URL("./", import.meta.url)
const swap = {
  "./stripeCheckout.js": new URL("fake-stripe.mjs", here).href,
  "./discountCodes.js": new URL("fake-discount.mjs", here).href,
  "./masteredExportDelivery.js": new URL("spy-delivery.mjs", here).href,
}
export async function resolve(specifier, context, next) {
  if (context.parentURL && context.parentURL.endsWith("/server/server.js") && swap[specifier]) {
    return { url: swap[specifier], shortCircuit: true }
  }
  return next(specifier, context)
}
