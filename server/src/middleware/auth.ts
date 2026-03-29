import type { MiddlewareHandler } from "hono";
import type { Env } from "../env.js";
import { verifyToken } from "../lib/token.js";

const PUBLIC_PATHS = ["/api/system/health", "/api/webhooks/", "/api/actions/"];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  if (isPublicPath(c.req.path)) {
    return next();
  }

  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = header.slice(7);
  const store = c.get("store");
  const tokenEntries = store.getTokenHashes();

  for (const entry of tokenEntries) {
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      continue;
    }

    const valid = await verifyToken(token, entry.hash);
    if (valid) {
      store.updateLastUsed(entry.name);
      return next();
    }
  }

  return c.json({ error: "Unauthorized" }, 401);
};
