import type { MiddlewareHandler } from "hono";
import type { Env } from "../env.js";
import { verifyToken } from "../lib/token.js";

const PUBLIC_PATHS = ["/api/system/health", "/api/webhooks/"];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}

function extractToken(c: {
  req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined };
}): string | null {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return c.req.query("token") ?? null;
}

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  if (isPublicPath(c.req.path)) {
    return next();
  }

  const token = extractToken(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

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
