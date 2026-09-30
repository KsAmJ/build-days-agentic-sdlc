import { describe, expect, it } from "vitest";
import type { PointsTransaction } from "../src/shared/contracts.js";
import { computeBalance, sortTransactions } from "../src/server/domain.js";

const transaction = (
  overrides: Partial<PointsTransaction> & Pick<PointsTransaction, "id">,
): PointsTransaction => ({
  memberId: "mbr-ada",
  points: 10,
  reason: "test",
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("sortTransactions", () => {
  it("orders newest first and breaks ties by id deterministically", () => {
    const input = [
      transaction({ id: "a", createdAt: "2025-01-01T00:00:00.000Z" }),
      transaction({ id: "c", createdAt: "2025-01-03T00:00:00.000Z" }),
      transaction({ id: "b", createdAt: "2025-01-01T00:00:00.000Z" }),
    ];
    const ordered = sortTransactions(input).map((item) => item.id);
    expect(ordered).toEqual(["c", "b", "a"]);
  });

  it("does not mutate the input array", () => {
    const input = [transaction({ id: "a" })];
    sortTransactions(input);
    expect(input).toHaveLength(1);
  });
});

describe("computeBalance", () => {
  it("returns zero when the member has no transactions", () => {
    expect(computeBalance([], "mbr-ada")).toBe(0);
  });

  it("sums only the selected member's transactions by stable identity", () => {
    const input = [
      transaction({ id: "1", memberId: "mbr-ada", points: 100 }),
      transaction({ id: "2", memberId: "mbr-grace", points: 50 }),
      transaction({ id: "3", memberId: "mbr-ada", points: 25 }),
    ];
    expect(computeBalance(input, "mbr-ada")).toBe(125);
    expect(computeBalance(input, "mbr-grace")).toBe(50);
  });

  it("is independent of list position", () => {
    const input = [
      transaction({ id: "1", memberId: "mbr-grace", points: 50 }),
      transaction({ id: "2", memberId: "mbr-ada", points: 100 }),
    ];
    const reversed = [...input].reverse();
    expect(computeBalance(input, "mbr-ada")).toBe(
      computeBalance(reversed, "mbr-ada"),
    );
  });
});
