import { describe, expect, it } from "vitest";
import {
  InMemoryPointsStore,
  TransactionNotFoundError,
  seedStorage,
} from "../src/server/storage.js";

const input = {
  memberId: "mbr-ada",
  points: 100,
  reason: "Purchase bonus",
} as const;

describe("InMemoryPointsStore", () => {
  it("creates and lists a transaction", async () => {
    const store = new InMemoryPointsStore();
    const created = await store.create(input);
    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
  });

  it("replays idempotently when the same id is supplied", async () => {
    const store = new InMemoryPointsStore();
    const first = await store.create(input, { id: "fixed-id" });
    const second = await store.create(input, { id: "fixed-id" });
    expect(second).toEqual(first);
    expect(await store.list()).toHaveLength(1);
  });

  it("gets a transaction by id and rejects unknown ids", async () => {
    const store = new InMemoryPointsStore();
    const created = await store.create(input, { id: "known" });
    expect(await store.get("known")).toEqual(created);
    await expect(store.get("missing")).rejects.toBeInstanceOf(
      TransactionNotFoundError,
    );
  });

  it("reports health", async () => {
    const store = new InMemoryPointsStore();
    await expect(store.checkHealth()).resolves.toBeUndefined();
  });

  it("seeds deterministically and is idempotent across instances", async () => {
    const store = new InMemoryPointsStore();
    await seedStorage(store);
    const first = await store.list();
    await seedStorage(store);
    const second = await store.list();
    expect(second).toHaveLength(first.length);
    expect(first.length).toBeGreaterThan(0);
  });
});
