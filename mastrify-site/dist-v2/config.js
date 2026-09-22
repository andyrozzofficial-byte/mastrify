/* Site configuration (v2). The backend sets these before the site scripts
 * load, or edits this file. Every endpoint is optional: when one is missing
 * or fails, the interface falls back to its offline behaviour. */
window.MastrifyConfig=Object.assign({
 siteUrl:'https://www.mastrify.com',
 supportEmail:'hello@mastrify.com',
 // POST JSON {topic,name,email,message,page,sentAt}; any 2xx means received.
 supportEndpoint:'/api/support/tickets',
 // Milliseconds to wait for the support endpoint before opening the mail app.
 supportTimeout:6000,
 // Query parameter a hosted payment page adds when it sends the user back to
 // /master (Stripe Checkout uses session_id). Any 'checkout' parameter works too.
 checkoutReturnParam:'session_id',
 // Seconds a real analysis / master usually takes. Paces the progress bar
 // until this browser has timed a few real runs (it learns from those), and
 // is ignored when the engine sends an eta with its progress.
 processingSeconds:{analyze:30,master:60}
},window.MastrifyConfig||{});
