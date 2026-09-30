---
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - "capstone/rewards-points/**"

permissions:
  actions: read
  contents: read
  pull-requests: read
  checks: read

engine: copilot

concurrency:
  group: capstone-rewards-readiness-${{ github.event.pull_request.number }}
  cancel-in-progress: true

tools:
  github:
    toolsets: [context, repos, actions, pull_requests]

network: defaults

safe-outputs:
  add-comment:
    max: 1

---

# Capstone rewards release-readiness

Assess release readiness for the rewards-points capstone on pull request
`#${{ github.event.pull_request.number }}`. Read only; produce exactly one
comment.

Inspect, using the read-only GitHub tools only:

- the pull request's changed files, confirming they stay within
  `capstone/rewards-points/` (plus its capstone CI/deploy/readiness workflows);
- the latest check runs for the head commit (`Capstone Rewards CI`,
  `OpenSpec validation and repository integrity`, and
  `OpenSpec specification PR policy`);
- whether the pull request body links an OpenSpec change under
  `openspec/changes/` and a merged `Specification PR: #<number>`.

Then post at most one comment titled `Rewards capstone release readiness` that:

- lists each evidence item as present or missing, citing the check name and its
  conclusion;
- states an overall readiness signal of `ready` only when every required check
  concluded successfully and the OpenSpec links resolve, otherwise `not ready`
  with the specific missing evidence;
- clearly separates observed evidence from any hypothesis.

Do not approve or merge the pull request, edit files or workflows, change
checks or branch protection, deploy, or expose secrets. If evidence is
unavailable, say so honestly rather than inferring success.
