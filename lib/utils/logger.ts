/**
 * Minimal structured logger. Every line carries a service/context name
 * and a timestamp so `docker compose logs` or Vercel's log viewer stays
 * legible once more than one route is logging concurrently — this is the
 * "structured logging" requirement from the architecture doc's
 * observability section, sized for a prototype (no external log
 * aggregator needed, just consistent shape).
 *
 * Server-only: do not import this in a "use client" component.
 */

type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

function write(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Creates a logger scoped to a given context (typically the route or
 * module name), e.g.:
 *   const log = logger("ingest/nvd");
 *   log.info("Fetched CVEs", { count: 42 });
 */
export function logger(context: string): Logger {
  return {
    info: (message, meta) => write("info", context, message, meta),
    warn: (message, meta) => write("warn", context, message, meta),
    error: (message, meta) => write("error", context, message, meta),
  };
}