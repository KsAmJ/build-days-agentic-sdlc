import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import {
  InMemoryPointsStore,
  type PointsStore,
} from "../src/server/storage.js";
import type { Logger } from "../src/server/logger.js";

const silentLogger: Logger = { log: () => {} };

const buildApp = (storage: PointsStore = new InMemoryPointsStore()) =>
  createApp({ storage, logger: silentLogger });

const valid = {
  memberId: "mbr-ada",
  points: 100,
  reason: "Purchase bonus",
};

describe("transactions api", () => {
  it("lists seeded members", async () => {
    const response = await request(buildApp()).get("/api/members");
    expect(response.status).toBe(200);
    expect(response.body.members.length).toBeGreaterThan(0);
  });

  it("creates a transaction and lists it", async () => {
    const app = buildApp();
    const created = await request(app).post("/api/transactions").send(valid);
    expect(created.status).toBe(201);
    expect(created.body.transaction.memberId).toBe("mbr-ada");

    const listed = await request(app).get("/api/transactions");
    expect(listed.body.items).toHaveLength(1);
  });

  it("rejects invalid input with field errors", async () => {
    const response = await request(buildApp())
      .post("/api/transactions")
      .send({ memberId: "mbr-ada", points: -5, reason: "" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fieldErrors.points).toBeDefined();
    expect(response.body.error.fieldErrors.reason).toBeDefined();
  });

  it("rejects an unknown member during creation", async () => {
    const response = await request(buildApp())
      .post("/api/transactions")
      .send({ ...valid, memberId: "mbr-unknown" });
    expect(response.status).toBe(400);
  });

  it("replays a create idempotently with an idempotency-key", async () => {
    const app = buildApp();
    const first = await request(app)
      .post("/api/transactions")
      .set("idempotency-key", "key-1")
      .send(valid);
    const second = await request(app)
      .post("/api/transactions")
      .set("idempotency-key", "key-1")
      .send(valid);
    expect(second.body.transaction.id).toBe(first.body.transaction.id);

    const listed = await request(app).get("/api/transactions");
    expect(listed.body.items).toHaveLength(1);
  });

  it("returns a balance selected by member identity", async () => {
    const app = buildApp();
    await request(app).post("/api/transactions").send(valid);
    await request(app)
      .post("/api/transactions")
      .send({ memberId: "mbr-grace", points: 50, reason: "x" });
    await request(app)
      .post("/api/transactions")
      .send({ ...valid, points: 25 });

    const response = await request(app).get("/api/members/mbr-ada/balance");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ memberId: "mbr-ada", balance: 125 });
  });

  it("returns 404 for an unknown member balance", async () => {
    const response = await request(buildApp()).get(
      "/api/members/mbr-unknown/balance",
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown transaction id", async () => {
    const response = await request(buildApp()).get("/api/transactions/missing");
    expect(response.status).toBe(404);
  });

  it("rejects malformed JSON", async () => {
    const response = await request(buildApp())
      .post("/api/transactions")
      .set("content-type", "application/json")
      .send("{not json");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});

void express;
