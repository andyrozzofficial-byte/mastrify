// Den riktiga leveransmodulen, med anropen loggade (en JSON-rad per anrop) i SPY_LOG.
import fs from "node:fs"
import * as real from "../../server/masteredExportDelivery.js"
const log = (name, args, result) => fs.appendFileSync(process.env.SPY_LOG, JSON.stringify({ name, args, result }) + "\n")
export async function deliverMasterExportEmail(args) { const r = await real.deliverMasterExportEmail(args); log("deliverMasterExportEmail", args, r); return r }
export async function recordMasteredExportDownload(args) { const r = await real.recordMasteredExportDownload(args); log("recordMasteredExportDownload", args, r); return r }
