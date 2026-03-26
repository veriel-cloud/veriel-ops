import { createMiddleware } from "hono/factory";
import type { Env } from "../env.js";
import { logger as rootLogger } from "../lib/logger.js";

const SILENT_PATHS = new Set(["/api/system/health", "/favicon.ico"]);

export const loggerMiddleware = createMiddleware<Env>(async (c, next) => {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID().slice(0, 8);
  const reqLogger = rootLogger.child({ requestId });

  c.set("logger", reqLogger);

  const path = c.req.path;
  if (SILENT_PATHS.has(path)) {
    await next();
    return;
  }

  const start = performance.now();
  const { method } = c.req;

  reqLogger.info({ method, path }, "incoming request");

  await next();

  const duration = Math.round(performance.now() - start);
  const status = c.res.status;

  const logFn = status >= 500 ? reqLogger.error : status >= 400 ? reqLogger.warn : reqLogger.info;
  logFn.call(reqLogger, { method, path, status, duration }, "request completed");
});
