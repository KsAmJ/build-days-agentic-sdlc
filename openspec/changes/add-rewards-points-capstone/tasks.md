# Tasks

## 1. App scaffold and ownership (owner: scaffold)

- [x] 1.1 Create `capstone/rewards-points/` with package manifest, TypeScript
  config, and `src/{shared,server,client}` + `tests/` folders; verify
  `npm install` and `npm run build` (empty build) succeed in the app directory.
- [x] 1.2 Add `capstone/rewards-points/AGENTS.md` documenting owned/prohibited
  paths, the seeded member list, points/reason limits, and the app-local
  validation commands; verify it lists every task seam from the design.
- [x] 1.3 Add app-local validation docs/scripts (lint, type-check, test, build)
  wired into package scripts; verify each script runs and reports actionable
  output.

## 2. Contracts and storage port (owner: contract-port; depends on 1)

- [x] 2.1 Define shared contracts (`PointsTransaction`, create request/response,
  balance response, member type) and the fixed seeded member set with documented
  limits; verify type-check passes and contracts import no React/Express/Azure
  types.
- [x] 2.2 Implement the storage-agnostic domain layer: deterministic ordering
  (createdAt then id) and balance-by-`memberId`; verify unit tests cover
  ordering stability, zero balance, and per-member isolation.
- [x] 2.3 Define the `PointsStore` port and `InMemoryPointsStore` (create with
  optional id/createdAt idempotency, list, checkHealth, seed); verify unit tests
  cover create, idempotent replay, list, and health.

## 3. API and Azure adapter (owner: api-adapter; depends on 2)

- [x] 3.1 Implement the Express API for create, list, members, and balance using
  the contracts and domain layer; verify API tests cover valid create, list
  order, and balance.
- [x] 3.2 Add actionable validation and error handling (unknown member,
  non-positive/over-limit points, invalid reason, unknown id no-op, replayed
  create); verify API tests cover each rejection and the not-found no-op.
- [x] 3.3 Implement `AzureTablePointsStore` behind the same port with
  environment-based selection and idempotent create (409 handling); verify a
  persistence test re-reads through a new in-memory adapter instance and a
  documented manual/integration note covers the Azure path.

## 4. Accessible UI (owner: ui; depends on 2)

- [x] 4.1 Build the React earn form, transaction list, and member balance view
  with an API client using the shared contracts; verify a happy-path UI test
  submits and shows updated list and balance.
- [x] 4.2 Implement loading, empty, success, validation (aria-associated), and
  recoverable-failure states with status text independent of color and logical
  post-action focus; verify UI-state tests cover each state and keyboard
  operation.

## 5. Liveness and readiness (owner: ops-probes; depends on 3)

- [x] 5.1 Add `/healthz` liveness and `/readyz` dependency-aware readiness
  (calls `store.checkHealth()`); verify tests show healthy+ready when storage is
  reachable and healthy+not-ready with a reason when storage fails.

## 6. Capstone CI/CD (owner: ci-cd; depends on 3, 4, 5)

- [ ] 6.1 Add capstone-named GitHub Actions workflow(s) that lint, type-check,
  test, build, and smoke-test the app with default read-only permissions; verify
  a real run passes and links from the pull request.

## 7. AVM infrastructure and OIDC deployment (owner: infra/delivery; depends on 6)

- [ ] 7.1 Author `capstone/rewards-points/infra` Bicep composing pinned AVM
  modules (storage-account + rewards table, Log Analytics, App Insights, App
  Service plan, web/site with system-assigned managed identity) and a Storage
  Table Data Contributor role assignment; verify `az bicep build`/lint and a
  what-if run succeed.
- [ ] 7.2 Add the OIDC deploy workflow targeting the assigned resource group
  through a protected environment with `id-token: write` scoped to the deploy
  job only; verify no long-lived secret is referenced and the workflow lints.
- [ ] 7.3 Deploy and capture evidence: deployed commit, URL, `/healthz`,
  `/readyz`, and one submit-to-balance smoke result against the live app; verify
  each is independently inspectable from the run/deployment.

## 8. Defect loop (owner: defect-fix; depends on 7)

- [ ] 8.1 File a bounded bug issue reproducing balance/selection by list
  position with two members reordered between load and action; verify the issue
  states expected vs actual, owned/prohibited paths, and focused validation.
- [ ] 8.2 Fix by selecting via stable `memberId` and add a failing-before,
  passing-after regression test; verify the regression test fails on the old
  behavior and passes after the fix.

## 9. GH-AW and evidence reconstruction (owner: delivery; depends on 8)

- [ ] 9.1 Add one narrowly safe GH-AW (release-readiness or evidence comment)
  that reads real capstone evidence and produces exactly one safe output with no
  approval/merge/deploy authority; verify a real run emits one safe output.
- [ ] 9.2 Perform a transcript-free evidence reconstruction from the parent
  issue through OpenSpec, task issues, pull requests, checks, deployment, bug
  fix, and GH-AW; verify every link resolves and file follow-ups for any gap.
