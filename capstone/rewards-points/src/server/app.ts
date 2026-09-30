import { randomUUID } from "node:crypto";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import { rateLimit } from "express-rate-limit";
import { ZodError, type ZodType } from "zod";
import {
  createTransactionSchema,
  isKnownMember,
  members,
  type ApiError,
  type CreateTransactionRequest,
  type MemberBalance,
} from "../shared/contracts.js";
import { computeBalance, sortTransactions } from "./domain.js";
import { logger as defaultLogger, type Logger } from "./logger.js";
import { TransactionNotFoundError, type PointsStore } from "./storage.js";

export interface AppOptions {
  storage: PointsStore;
  logger?: Logger;
  staticDirectory?: string;
}

export const createApp = ({
  storage,
  logger = defaultLogger,
  staticDirectory,
}: AppOptions) => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));
  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") ?? randomUUID();
    response.setHeader("x-request-id", requestId);
    const startedAt = performance.now();
    response.on("finish", () => {
      logger.log("info", "http_request", {
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });
    next();
  });
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (request) =>
        request.path === "/healthz" || request.path === "/readyz",
      handler: (_request, response) => {
        response.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again shortly.",
          },
        } satisfies ApiError);
      },
    }),
  );

  app.get("/healthz", (_request, response) => {
    response.json({ status: "healthy" });
  });

  app.get("/readyz", async (_request, response) => {
    try {
      await storage.checkHealth();
      response.json({ status: "ready" });
    } catch (error) {
      logger.log("error", "readiness_failed", {
        error: error instanceof Error ? error.message : "Unknown storage error",
      });
      response.status(503).json({
        status: "not_ready",
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "Storage is unavailable.",
        },
      });
    }
  });

  app.get("/api/members", (_request, response) => {
    response.json({ members });
  });

  app.get("/api/transactions", async (_request, response) => {
    response.json({ items: sortTransactions(await storage.list()) });
  });

  app.post(
    "/api/transactions",
    validateBody(createTransactionSchema),
    async (request, response) => {
      const idempotencyKey = request.header("idempotency-key");
      const transaction = await storage.create(
        request.body as CreateTransactionRequest,
        idempotencyKey ? { id: idempotencyKey } : undefined,
      );
      response.status(201).json({ transaction });
    },
  );

  app.get("/api/transactions/:id", async (request, response, next) => {
    try {
      response.json({ transaction: await storage.get(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/members/:memberId/balance", async (request, response) => {
    const memberId = request.params.memberId;
    if (!isKnownMember(memberId)) {
      response.status(404).json({
        error: { code: "NOT_FOUND", message: "Member was not found." },
      } satisfies ApiError);
      return;
    }
    const balance = computeBalance(await storage.list(), memberId);
    response.json({ memberId, balance } satisfies MemberBalance);
  });

  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get("*splat", (_request, response) => {
      response.sendFile("index.html", { root: staticDirectory });
    });
  }

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    if (error instanceof TransactionNotFoundError) {
      response.status(404).json({
        error: { code: "NOT_FOUND", message: "Transaction was not found." },
      } satisfies ApiError);
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      } satisfies ApiError);
      return;
    }
    logger.log("error", "request_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    } satisfies ApiError);
  };
  app.use(errorHandler);

  return app;
};

function validateBody(schema: ZodType): RequestHandler {
  return (request, response, next) => {
    try {
      request.body = schema.parse(request.body);
      next();
    } catch (error) {
      if (!(error instanceof ZodError)) {
        next(error);
        return;
      }
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = String(issue.path[0] ?? "request");
        (fieldErrors[field] ??= []).push(issue.message);
      }
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the highlighted fields and try again.",
          fieldErrors,
        },
      } satisfies ApiError);
    }
  };
}
