# Agent guide — rewards-points capstone

This is an optional Lab 6 capstone app. It is self-contained and must not modify
the reference application under the repository root `src/`, `infra/`, or shared
workflows.

## Owned paths

- `capstone/rewards-points/src/**`
- `capstone/rewards-points/tests/**`
- `capstone/rewards-points/infra/**`
- `capstone/rewards-points/*` config files
- `.github/workflows/capstone-rewards-*.yml` (capstone-scoped workflows only)

## Prohibited paths

- Root `src/`, `infra/`, and any non-capstone workflow — reference only, never edit.
- Any other capstone app directory.

## Scope guardrails

- One entity (`PointsTransaction`) and one workflow (earn points + running balance).
- Members are a fixed, seeded set in `src/shared/contracts.ts`. Never add runtime
  member creation/editing.
- Balance is always derived by summing a member's transactions selected by the
  member's stable `memberId` — never by list position and never stored.
- Storage access goes through the `PointsStore` port. Adapters: in-memory (default,
  tests/dev) and Azure Table Storage (`STORAGE_BACKEND=azure`).

## Seeded members

`mbr-ada`, `mbr-grace`, `mbr-alan`, `mbr-katherine`.

## Limits

- `maxPoints` per transaction: 100000
- `reason` length: 1–200 characters (trimmed)

## Validation commands

Run from `capstone/rewards-points/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check   # all of the above
```
