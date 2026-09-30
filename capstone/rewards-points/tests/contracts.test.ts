import { describe, expect, it } from "vitest";
import {
  createTransactionSchema,
  isKnownMember,
  limits,
  members,
} from "../src/shared/contracts.js";

describe("contracts", () => {
  it("exposes a fixed set of known members", () => {
    expect(members.length).toBeGreaterThan(0);
    expect(isKnownMember("mbr-ada")).toBe(true);
    expect(isKnownMember("mbr-unknown")).toBe(false);
  });

  it("accepts a valid transaction and trims the reason", () => {
    const result = createTransactionSchema.parse({
      memberId: "mbr-ada",
      points: 100,
      reason: "  Purchase bonus  ",
    });
    expect(result.reason).toBe("Purchase bonus");
  });

  it("rejects an unknown member", () => {
    const result = createTransactionSchema.safeParse({
      memberId: "mbr-unknown",
      points: 10,
      reason: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive and non-integer points", () => {
    expect(
      createTransactionSchema.safeParse({
        memberId: "mbr-ada",
        points: 0,
        reason: "x",
      }).success,
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({
        memberId: "mbr-ada",
        points: 1.5,
        reason: "x",
      }).success,
    ).toBe(false);
  });

  it("rejects points above the maximum", () => {
    expect(
      createTransactionSchema.safeParse({
        memberId: "mbr-ada",
        points: limits.maxPoints + 1,
        reason: "x",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty or over-long reason", () => {
    expect(
      createTransactionSchema.safeParse({
        memberId: "mbr-ada",
        points: 10,
        reason: "   ",
      }).success,
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({
        memberId: "mbr-ada",
        points: 10,
        reason: "x".repeat(limits.reason + 1),
      }).success,
    ).toBe(false);
  });
});
