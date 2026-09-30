# Spec Delta

## Purpose

Earn-only customer loyalty points ledger that records points-earning
transactions for members from a fixed set and computes each member's running
balance, exposed through an accessible UI and a durable, health-observable API.

## ADDED Requirements

### Requirement: Fixed member set

The system SHALL recognize only members from a fixed, seeded member set. Each
member has a stable identifier and a display name. The system SHALL NOT create,
edit, or remove members at runtime.

#### Scenario: Seeded members are available

- **WHEN** a client requests the set of members
- **THEN** the system returns each seeded member's stable identifier and display
  name in a deterministic order

#### Scenario: Unknown member is rejected

- **WHEN** a client references a member identifier that is not in the seeded set
- **THEN** the system rejects the request with an actionable error and does not
  create or modify any transaction

### Requirement: Record a points-earning transaction

The system SHALL allow recording a points-earning transaction that references a
member from the fixed set, a positive integer points amount within a documented
maximum, and a non-empty reason within a documented length limit. On success the
system SHALL persist the transaction with a stable identifier and a created
timestamp.

#### Scenario: Valid earn transaction is recorded

- **WHEN** a client submits a transaction for a known member with a valid points
  amount and reason
- **THEN** the system persists it, assigns a stable identifier and created
  timestamp, and returns the stored transaction

#### Scenario: Non-positive or over-limit points are rejected

- **WHEN** a client submits a transaction whose points amount is zero, negative,
  non-integer, or above the documented maximum
- **THEN** the system rejects the request with an actionable validation error
  and persists nothing

#### Scenario: Invalid reason text is rejected

- **WHEN** a client submits a transaction whose reason is empty or exceeds the
  documented length limit
- **THEN** the system rejects the request with an actionable validation error
  associated with the reason field and persists nothing

#### Scenario: Replayed create is handled deterministically

- **WHEN** a client submits the same create request more than once using a
  documented idempotency mechanism
- **THEN** the system applies the earn at most once and returns one documented,
  tested response rather than silently duplicating the transaction

### Requirement: List transactions deterministically

The system SHALL list recorded transactions in a deterministic order that does
not depend on storage-adapter iteration order.

#### Scenario: Transactions are listed in stable order

- **WHEN** a client lists transactions after several have been recorded
- **THEN** the system returns them in the same deterministic order on repeated
  requests

#### Scenario: Empty ledger returns an empty list

- **WHEN** a client lists transactions before any have been recorded
- **THEN** the system returns an empty list rather than an error

### Requirement: Compute a member's running balance

The system SHALL compute a member's running balance as the sum of the points of
that member's transactions, selected by the member's stable identifier and never
by display order or list position.

#### Scenario: Balance sums a member's transactions

- **WHEN** a client requests the balance for a member who has recorded
  transactions
- **THEN** the system returns the sum of that member's transaction points and
  excludes other members' transactions

#### Scenario: Member with no transactions has a zero balance

- **WHEN** a client requests the balance for a known member who has no
  transactions
- **THEN** the system returns a zero balance rather than an error

#### Scenario: Unknown identifier does not mutate data

- **WHEN** a client requests a balance or references a transaction identifier
  that does not exist
- **THEN** the system returns an actionable not-found response without changing
  stored data

### Requirement: Durable persistence behind a storage boundary

The system SHALL persist transactions through an application-owned storage
boundary. Focused tests MAY substitute a deterministic in-memory adapter; the
deployed application SHALL retain transactions across page refresh and process
restart.

#### Scenario: Data survives a new adapter instance

- **WHEN** transactions are recorded and later read through a new storage
  adapter instance backed by the same store
- **THEN** the previously recorded transactions and computed balances are
  unchanged

### Requirement: Accessible earn-and-balance UI

The system SHALL provide a keyboard-operable UI to submit an earn transaction,
view the transaction list, and view a selected member's balance, with labeled
controls, loading, empty, success, validation, and recoverable-failure states,
and status conveyed independent of color with a logical focus path after
actions.

#### Scenario: Successful submission gives feedback

- **WHEN** a user submits a valid earn transaction through the UI
- **THEN** the UI shows a success state, updates the visible transaction list
  and balance, and moves focus along a logical path

#### Scenario: Validation errors are associated with controls

- **WHEN** a user submits invalid input through the UI
- **THEN** the UI shows a validation message programmatically associated with the
  relevant control and does not lose the user's other input

#### Scenario: Loading and empty states are perceivable

- **WHEN** transaction or balance data is loading or empty
- **THEN** the UI presents a perceivable loading state and a distinct empty
  state using text, not color alone

#### Scenario: API failure is recoverable

- **WHEN** an API request from the UI fails
- **THEN** the UI shows a recoverable failure state that lets the user retry
  without losing entered data

### Requirement: Liveness and dependency-aware readiness

The system SHALL expose a liveness endpoint reflecting process health and a
readiness endpoint reflecting its ability to reach the storage dependency, so a
storage outage is distinguishable from a healthy, ready service.

#### Scenario: Healthy service is live and ready

- **WHEN** the process is running and storage is reachable
- **THEN** the liveness endpoint reports healthy and the readiness endpoint
  reports ready

#### Scenario: Storage outage is reported as not ready

- **WHEN** the process is running but the storage dependency is unreachable
- **THEN** the liveness endpoint still reports healthy while the readiness
  endpoint reports not ready with an actionable reason
