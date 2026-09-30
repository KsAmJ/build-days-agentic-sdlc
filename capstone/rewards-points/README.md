# Rewards Points

A small customer-loyalty capstone app: record the points a member earns and show
their running balance. Built with TypeScript, React, and Express, mirroring the
reference feedback app's architecture and deployment model.

## Workflow

- Pick a member (fixed, seeded set), enter points and a reason, and record a
  points-earning transaction.
- View any member's running balance, derived by summing that member's
  transactions by stable identity.
- Transactions are listed newest-first in a deterministic order.

## Getting started

```bash
cd capstone/rewards-points
npm install
npm run dev        # client on :5174, API proxied
```

Seed sample data on server start with `SEED_DATA=true`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite client + Express API in watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (client + server) |
| `npm test` | Vitest unit/integration tests |
| `npm run build` | Build client and server to `dist/` |
| `npm start` | Run the built server (`dist/server/index.js`) |
| `npm run check` | lint + typecheck + test + build |

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Server port |
| `STORAGE_BACKEND` | `memory` | `memory` or `azure` |
| `AZURE_STORAGE_ACCOUNT_URL` | — | Table endpoint; selects Azure when set |
| `AZURE_STORAGE_TABLE_NAME` | `rewards` | Azure table name |
| `SEED_DATA` | `false` | Seed sample transactions on startup |

## Endpoints

- `GET /healthz` — liveness
- `GET /readyz` — readiness (verifies storage)
- `GET /api/members` — seeded members
- `GET /api/transactions` — deterministic, newest-first list
- `POST /api/transactions` — record points (supports `idempotency-key` header)
- `GET /api/transactions/:id` — fetch one
- `GET /api/members/:memberId/balance` — running balance

## Deployment

Azure infrastructure is defined under `infra/` using Azure Verified Modules and
deployed with GitHub OIDC (no long-lived credentials). See `infra/README.md`.
