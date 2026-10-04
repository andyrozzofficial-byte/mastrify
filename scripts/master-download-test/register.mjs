// Laddas med `node --import` före server/server.js i verify-master-download-api.mjs.
import { register } from "node:module"
register("./hooks.mjs", import.meta.url)
