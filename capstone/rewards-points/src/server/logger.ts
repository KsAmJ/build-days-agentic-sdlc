export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  log(level: LogLevel, event: string, details?: Record<string, unknown>): void;
}

export const logger: Logger = {
  log(level, event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...details,
    };
    const output = JSON.stringify(entry);
    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  },
};
