import type { PointsTransaction } from "../shared/contracts.js";

/**
 * Storage-agnostic domain logic. Ordering and balance are computed by the
 * application so results never depend on a storage adapter's iteration order,
 * and balances are always keyed by a member's stable identifier.
 */

/**
 * Return transactions in a deterministic total order: newest first by
 * createdAt, then by id as a stable tiebreaker.
 */
export const sortTransactions = (
  transactions: readonly PointsTransaction[],
): PointsTransaction[] =>
  [...transactions].sort((a, b) => {
    const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
    return byCreatedAt !== 0 ? byCreatedAt : b.id.localeCompare(a.id);
  });

/**
 * Compute a member's running balance as the sum of the points of that member's
 * transactions, selected by the member's stable identifier only.
 */
export const computeBalance = (
  transactions: readonly PointsTransaction[],
  memberId: string,
): number =>
  transactions
    .filter((transaction) => transaction.memberId === memberId)
    .reduce((total, transaction) => total + transaction.points, 0);
