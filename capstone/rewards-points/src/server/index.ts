import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { logger } from "./logger.js";
import { createStorageFromEnvironment, seedStorage } from "./storage.js";

const storage = createStorageFromEnvironment();
await storage.initialize();
if (process.env.SEED_DATA === "true") {
  await seedStorage(storage);
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const staticDirectory =
  process.env.NODE_ENV === "production"
    ? path.resolve(currentDirectory, "../client")
    : undefined;
const app = createApp({ storage, logger, staticDirectory });
const port = Number(process.env.PORT ?? 3000);

app.listen(port, "0.0.0.0", () => {
  logger.log("info", "server_started", {
    port,
    storageBackend:
      process.env.STORAGE_BACKEND ??
      (process.env.AZURE_STORAGE_ACCOUNT_URL ? "azure" : "memory"),
  });
});
