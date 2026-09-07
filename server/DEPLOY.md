# Mastrify API server (canonical)

**Production:** Railway service `mastrify-backend-production` deploys from the **`mastrify` Git repo** with **Root Directory = `server`**.

Start command: `npm start` → `node server.js`

Verify deployed revision:

```bash
curl https://mastrify-backend-production.up.railway.app/debug-version
# {"debugVersion":"NEW_MASTER_RESPONSE_V2"}
```

The separate `mastrify-backend` GitHub repo is kept in sync with this folder for backup/history — **Railway does not deploy from that repo** (confirmed via production probe + `origin/main` diff).

Required env (Railway):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` (optional; local `/tmp` fallback)
- `RESEND_API_KEY` (email delivery via `POST /master/deliver`)
- `STRIPE_SECRET_KEY` (backend payment verify for deliver — configure when enabling payments)

Frontend env: see `mastrify/.env.example` (Stripe checkout runs on Vercel/Next API routes).
