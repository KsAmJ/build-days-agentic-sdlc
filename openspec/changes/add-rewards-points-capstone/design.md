# Design

## Context

See `proposal.md` (Why) for motivation and the `rewards-points` spec for the
behavior contract. This is an optional Lab 6 capstone application built net-new
under `capstone/rewards-points/`. Root `DESIGN.md` constrains it: dependency
direction is inward (UI/transport may use shared contracts; the API depends on a
storage interface; Azure code implements that interface), infrastructure uses
pinned Azure Verified Modules, GitHub Actions authenticates to Azure with OIDC,
and evidence must come from real checks/deployments rather than agent claims.
`capstone/AGENTS.md` requires one entity, one workflow, a storage boundary,
liveness/readiness, capstone-named workflow files, and no changes to `src/`.

The existing feedback application (`src/`, `infra/main.bicep`) is the
**architectural reference only** — its shared-contracts + storage-port +
in-memory/Azure-Table adapter shape and its AVM composition are patterns to
follow, not code to copy or rebrand.

## Goals / Non-Goals

**Goals:**

- A solution-neutral-at-spec, concretely-designed TypeScript app: shared
  contracts, Express API, React client, and a storage port with in-memory and
  Azure Table adapters.
- Correct balance-by-stable-identity computation and deterministic ordering that
  does not depend on adapter iteration order.
- A reproducible capstone CI/CD and an AVM/OIDC Azure deployment isolated from
  the workshop's existing workflows and infrastructure.
- A design that makes the planned defect (balance/selection by list position)
  and its regression test obvious.

**Non-Goals (design-level):**

- Redemption, expiration, tiers, member CRUD, auth, notifications, reporting
  (already excluded in the proposal).
- Reusing or importing any `src/` feedback code.
- A shared Azure resource with the feedback app; the capstone deploys its own
  resources within the team's assigned resource group.

## Decisions

### D1: Single entity `PointsTransaction`; members are a seeded constant
The only persisted entity is an earn transaction
(`{ id, memberId, points, reason, createdAt }`). The member set is a fixed
seeded constant (`{ id, displayName }[]`) in shared contracts, mirroring the
briefs' "fixed request-type set" pattern. **Why:** keeps the capstone at one
entity/one workflow. **Alternative considered:** a first-class `Member` entity
with enrollment — rejected as a second entity/workflow outside the time box.

### D2: Balance is derived, keyed by `memberId`
Balance is computed as the sum of `points` over transactions filtered by
`memberId`; it is never stored and never selected by list index. **Why:**
correctness and directly enabling the spec's stable-identity requirement.
**Alternative:** a stored running total per member — rejected as redundant state
that can drift and is not needed at this scale.

### D3: Deterministic ordering independent of storage
List order is a total order computed by the application (by `createdAt`, then
`id` as a tiebreaker) after reading from storage, so neither the in-memory Map
nor Azure Table iteration order can change results. **Why:** satisfies the
deterministic-order scenarios and keeps the two adapters behaviorally
equivalent.

### D4: Storage port with two adapters (mirrors reference app)
Define a `PointsStore` interface (`initialize`, `create` with optional
id/createdAt for idempotency + seeding, `list`, `checkHealth`). Provide
`InMemoryPointsStore` for tests and `AzureTablePointsStore` for deployment,
selected by environment (`STORAGE_BACKEND` / account URL), following the
reference `createStorageFromEnvironment` pattern. Balance is computed in a
storage-agnostic domain function over `list()` results, not in the adapter.
**Why:** honors the inward dependency rule and lets focused tests run without
Azure. **Alternative:** query-time aggregation pushed into Table Storage —
rejected to keep both adapters equivalent and testable in memory.

### D5: Idempotent create via caller-supplied key
`create` accepts an optional stable id; a repeated create with the same id
returns the existing transaction rather than duplicating (reference-app
pattern; Azure adapter treats HTTP 409 as "already created"). **Why:** satisfies
the replayed-create scenario deterministically.

### D6: Express serves API + built React bundle on one App Service
A single Express process exposes `/api/*`, `/healthz` (liveness), `/readyz`
(dependency-aware readiness calling `store.checkHealth()`), and serves the
production React bundle, matching the reference single-App-Service topology.
**Why:** the simplest suitable hosting for the time box and reuses the proven
deployment shape.

### D7: AVM-first infrastructure, capstone-scoped and named
New Bicep under `capstone/rewards-points/infra/` composes pinned AVM modules for
storage-account (with a rewards table), Log Analytics workspace, Application
Insights, App Service plan (Linux, B1), and web/site with a system-assigned
managed identity. A Storage Table Data Contributor role assignment grants the
web app data-plane access. **Why:** required by root design and `infra/AGENTS.md`;
reuses validated module versions from `infra/main.bicep`. Module versions are
re-confirmed at implementation time. **Alternative:** hand-written resources —
rejected by the AVM-first guardrail.

### D8: GitHub OIDC, protected environment, managed identity; no secrets
Capstone CI/CD (`.github/workflows/capstone-rewards-*.yml`, capstone-named
because GitHub requires workflow files at that path) defaults to read-only
permissions and grants `id-token: write` only to the deploy job. Deployment uses
OIDC into the team's assigned resource group through a protected environment; the
app reaches storage via managed identity. **Why:** root security decisions
forbid long-lived cloud credentials and require least privilege. The root-level
workflow-file location exception is recorded here per `capstone/AGENTS.md`.

### D9: Accessibility approach
The React UI uses native labeled form controls, `aria-describedby` for
validation messages, an `aria-live` region for success/failure/loading status
(text, not color alone), and explicit focus management after submit. **Why:**
satisfies the accessibility scenarios and keeps them testable via role/label
queries.

## Risks / Trade-offs

- **Balance/selection by list position (the planned defect)** → design isolates
  balance in a domain function keyed by `memberId` and adds a two-member,
  reordered regression test so the fix is selecting by stable identity.
- **Adapter behavioral drift between in-memory and Azure Table** → a shared
  ordering/balance domain layer and a persistence test that re-reads through a
  new adapter instance keep them equivalent.
- **AVM module version drift from the reference infra** → pin versions and
  re-confirm against the AVM registry during the infra task; record any gap in
  this design.
- **Root-level capstone workflow files near workshop workflows** → capstone
  prefix on every file and no edits to existing `openspec.yml`/`ci.yml`/etc.
- **Azure or licensed control unavailable in the time box** → record the exact
  limitation and preserve local/CI evidence without claiming equivalent
  deployment (Lab 6 recovery guidance).

## Migration Plan

Net-new; no data migration. Deploy order: (1) provision infra via
`infra-validate` what-if then deploy; (2) deploy the app to App Service through
the protected environment; (3) verify `/healthz`, `/readyz`, and one
submit-to-balance smoke path against the live URL. Rollback: redeploy the prior
green commit; because there is no schema, teardown is limited to the capstone's
own resources in the assigned resource group.

## Open Questions

None that affect the specs, approach, or task breakdown. Concrete limits (max
points per transaction, reason length, seeded member list) are design-owned
constants finalized in the contract task and documented in the app's
`AGENTS.md`.
