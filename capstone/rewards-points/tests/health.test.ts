import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import {
  InMemoryPointsStore,
  type PointsStore,
} from "../src/server/storage.js";
import type { Logger } from "../src/server/logger.js";

const silentLogger: Logger = { log: () => {} };

describe("health probes", () => {
  it("reports liveness at /healthz", async () => {
    const app = createApp({
      storage: new InMemoryPointsStore(),
      logger: silentLogger,
    });
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("healthy");
  });

  it("reports readiness at /readyz when storage is healthy", async () => {
    const app = createApp({
      storage: new InMemoryPointsStore(),
      logger: silentLogger,
    });
    const response = await request(app).get("/readyz");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ready");
  });

  it("reports not ready when storage health fails", async () => {
    const failingStore: PointsStore = {
      initialize: () => Promise.resolve(),
      list: () => Promise.resolve([]),
      create: () => Promise.reject(new Error("unavailable")),
      get: () => Promise.reject(new Error("unavailable")),
      checkHealth: () => Promise.reject(new Error("storage down")),
    };
    const app = createApp({ storage: failingStore, logger: silentLogger });
    const response = await request(app).get("/readyz");
    expect(response.status).toBe(503);
    expect(response.body.status).toBe("not_ready");
  });
});
