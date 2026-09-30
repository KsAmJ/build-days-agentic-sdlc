# Proposal

## Why

The optional Lab 6 capstone requires each team to build one bounded, net-new
application end to end through a reviewed OpenSpec contract, App-driven sessions,
independent CI/CD, and AVM/OIDC Azure deployment. This change proposes a
**customer loyalty rewards points** application so the team has a governed,
comparable capstone that exercises the full issue-to-deployment evidence chain
without touching the existing feedback application.

## What Changes

- Add a new net-new application under `capstone/rewards-points/` with its own
  local `AGENTS.md` and application-local validation documentation.
- Model exactly one entity — a **points transaction** (an earn-only ledger
  entry for a member drawn from a fixed seeded member set) — and one primary
  workflow: record a points-earning transaction and view a member's running
  balance.
- Provide a small HTTP API to create a valid earn transaction, list
  transactions in deterministic order, and return a member's running balance,
  with actionable rejection of unknown members, invalid amounts, and invalid
  text, and a documented response for a replayed create.
- Provide an accessible, keyboard-operable React UI with labeled controls and
  loading, empty, success, validation, and recoverable-failure states, plus
  status conveyed independent of color.
- Persist transactions behind an application-owned storage boundary: an
  in-memory adapter for tests and an Azure Table Storage adapter for deployment.
- Expose process liveness and dependency-aware readiness so a storage outage is
  distinguishable from a healthy, ready service.
- Add capstone-scoped GitHub Actions CI/CD, pinned AVM infrastructure, and a
  GitHub OIDC protected-environment deployment using a managed identity.
- Exercise one realistic defect loop (balance derived from stable member
  identity rather than list position) and add one narrowly safe GH-AW output.

Non-goals: redeeming/spending points, point expiration, loyalty tiers,
member enrollment or member CRUD, authentication/authorization, notifications,
reporting/analytics, and external loyalty-system integrations.

## Capabilities

### New Capabilities
- `rewards-points`: Earn-only customer loyalty points ledger — recording a
  points-earning transaction for a fixed-set member, listing transactions
  deterministically, and computing a member's running balance, behind a storage
  boundary with liveness and dependency-aware readiness.

### Modified Capabilities
<!-- None. This is a net-new capstone capability and does not change existing
     feedback-application requirements. -->

## Impact

- **Application**: New `capstone/rewards-points/` subtree (shared TypeScript
  contracts, Express API, React client, storage port with in-memory and Azure
  Table adapters). The existing `src/` feedback application is unchanged.
- **Tests**: New focused unit, API, UI-state, persistence, and deployed
  smoke/health/readiness tests scoped to the capstone app.
- **Infrastructure**: New pinned AVM Bicep composition (App Service, Table
  Storage, monitoring) in the team's assigned resource group. Capstone-named
  root-level workflow files only where GitHub requires that location.
- **Workflow/Delivery**: New capstone-scoped CI/CD and one narrow GH-AW;
  existing workshop workflows unchanged.
- **Security**: GitHub OIDC to Azure, protected-environment approval,
  system-assigned managed identity with only the Storage Table data-plane role;
  no long-lived cloud credentials.
- **Documentation**: New `capstone/rewards-points/AGENTS.md` and app-local
  validation notes; capstone workflow-file exceptions recorded in this change's
  design.
