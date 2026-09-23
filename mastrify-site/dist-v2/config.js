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
 processingSeconds:{analyze:15,master:60},
 // Shortest time the analyze screen runs. A fast engine does not make the
 // screen flash by: the bar is paced over this and the result opens when it
 // is up. Master timing is unchanged.
 minimumSeconds:{analyze:15},
 // Analyze only: when the engine only reports "started" and "finished", the
 // bar paces itself over processingSeconds (up to 95%) instead of standing
 // still. Set false to let the bar wait for reports.
 pacedWhenQuiet:true
},window.MastrifyConfig||{});
