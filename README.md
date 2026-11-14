# ACCOUNT QUEST — Customer Success Intelligence CRM

A live Customer Success CRM for the FlytBase **Questathon**. It pulls real account data from the Questathon MCP server, caches it, answers **the five questions** for every account with traceable evidence IDs, ranks three owned and dated first moves, documents unknowns honestly, shows live events, and writes notes back to the game.

> No customer data is hardcoded anywhere. Every number comes from a cached MCP response and links to a source record.

## Architecture

```
Browser (React + Vite + Tailwind + Recharts)
        │  only talks to our API, never to MCP, never sees the token
        ▼
Express API ── AQ_TOKEN (env var, server-side only)
   ├─ mcp.js        JSON-RPC tools/call client, JSON + text/event-stream parsing,
   │                serialized queue, persisted 60 s limiter, token scrubbing
   ├─ db.js         SQLite (node:sqlite): raw responses, history, signals, notes, local tasks
   ├─ normalize.js  defensive field-alias normalization; unknown stays null
   ├─ analysis.js   rules-based engine: evidence library + five questions
   └─ index.js      REST API, review flags for new signals, write-back log
        ▼
Questathon MCP  https://questathon.aihackerscollective.com/api/public/mcp
```

**Rate limit (1 MCP call / minute, writes included):** every MCP call goes through one queue. The time of the last call is persisted, so restarts cannot violate the limit, and against the official endpoint the 60 s gap cannot be configured lower. The UI shows a live cooldown timer, queue state and last successful sync. `GET /api/status` and `GET /api/data` read only the local cache, so browsing and testing never spend MCP calls. There is no background polling. The only automatic calls are a one-time bootstrap when the cache is empty (see `AUTO_SYNC_ON_EMPTY`).

**Evidence IDs** are references to real records, never invented: `ACCT:<account id>`, `DEAL:<account>:<deal id>`, `PERSON:<account>:<id or name>`, `DOC:<paperwork id>`, `SIG:<signal id>`, `SCHEMA:get_data_format`. When a record has no id in the data, its array index is used (`#2`). Click any ID to see its raw stored record.

**Verification statuses:** *Verified* (cited paperwork, or the same amount appears in an account document), *Told* (a person or signal said it), *Unverified* (account sheet only), *Unknown*. Unsupported amounts are listed separately from verified totals.

**AI layer:** a deterministic rules engine (no external AI API, no fabricated output). Everything it produces is labelled as a recommendation.

## Run locally

Requires Node.js ≥ 22.13.

```bash
# 1. API
cd server
cp .env.example .env          # then edit .env and set AQ_TOKEN privately
npm install
export $(grep -v '^#' .env | xargs)   # or set the variables however you prefer
npm start                      # http://localhost:8787

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                    # http://localhost:5173 (proxies /api to :8787)
```

On first start with an empty cache the server queues four calls (accounts → schema → paperwork → signals), about 4 minutes in total. Or press **Sync now**.

Tests: `cd server && npm test`. A mock MCP server for safe local testing lives in `mock/` (test fixtures only): `node mock/mock-mcp.js`, then start the API with `MCP_URL=http://localhost:9099 MCP_MIN_GAP_MS=700 AQ_TOKEN=test-token`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `AQ_TOKEN` | server | **Required.** MCP bearer token. Never commit it. |
| `DB_PATH` | server | SQLite file location (use a persistent disk in production). |
| `WRITE_PASSCODE` | server | Optional. If set, sync / write_note / task edits need this passcode (entered in the header). Recommended on a public site so visitors cannot spend your rate limit. |
| `CORS_ORIGIN` | server | Frontend origin when hosted separately. |
| `AUTO_SYNC_ON_EMPTY` | server | `false` disables the one-time bootstrap. |
| `VITE_API_URL` | client build | API base URL when frontend and API are on different hosts. Not a secret. |

## Deploy

**Simplest (one service, recommended): Render.** Push the repo to GitHub, create a Render *Blueprint* from `render.yaml`, set `AQ_TOKEN` (and `WRITE_PASSCODE`) in the dashboard. Express serves the built React app and the API from one URL. With a persistent disk the cache survives redeploys; without one, the app re-syncs automatically (≈4 min) after each restart and judges see an empty state until then.

**Split: Vercel + Render.** Deploy `server/` to Render as above, set `CORS_ORIGIN` to your Vercel URL. Deploy `client/` to Vercel with `VITE_API_URL` set to the Render URL.

## Notes on data shape

The MCP response schema is discovered at runtime. `normalize.js` reads fields through alias lists (e.g. value / amount / deal_value) and keeps unknown fields as `null`. If the real payload uses names it does not recognise, open **Evidence → Stored raw MCP responses** and add the aliases to `normalize.js`; nothing else needs to change. Allowed `write_note` kinds are read from the `get_data_format` schema when it lists them, otherwise `note, task, risk, next_step` are offered.

## Repository layout

```
client/   React app          server/   Express API + analysis engine
mock/     test-only fake MCP docs/     thinking document + video script
```
