import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../../env.js";
import { runMigrations } from "../../lib/migrations.js";
import { generateApiToken, hashToken } from "../../lib/token.js";
import { createDbStore, type DbStore } from "../../services/db-store.js";
import { authMiddleware } from "../auth.js";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}

let store: DbStore;
let validToken: string;
let app: Hono<Env>;

beforeEach(async () => {
  store = createDbStore(createTestDb());

  validToken = generateApiToken();
  const hash = await hashToken(validToken);
  store.saveToken("test", hash);

  app = new Hono<Env>();

  // Inject store before auth middleware (like index.ts does)
  app.use("/*", async (c, next) => {
    c.set("store", store);
    await next();
  });
  app.use("/*", authMiddleware);

  app.get("/api/projects", (c) => c.json({ ok: true }));
  app.get("/api/system/health", (c) => c.json({ status: "ok" }));
  app.post("/api/webhooks/github", (c) => c.json({ ok: true }));
  app.post("/api/webhooks/cloudflare", (c) => c.json({ ok: true }));
});

describe("authMiddleware", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await app.request("/api/projects");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    const res = await app.request("/api/projects", {
      headers: { Authorization: "Bearer invalid-token" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with valid token", async () => {
    const res = await app.request("/api/projects", {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("allows /api/system/health without token", async () => {
    const res = await app.request("/api/system/health");
    expect(res.status).toBe(200);
  });

  it("allows /api/webhooks/github without token", async () => {
    const res = await app.request("/api/webhooks/github", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("allows /api/webhooks/cloudflare without token", async () => {
    const res = await app.request("/api/webhooks/cloudflare", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("returns 401 for missing Bearer prefix", async () => {
    const res = await app.request("/api/projects", {
      headers: { Authorization: validToken },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 for expired token", async () => {
    const expiredToken = generateApiToken();
    const expiredHash = await hashToken(expiredToken);
    const pastDate = new Date(Date.now() - 86400_000).toISOString();
    store.saveToken("expired", expiredHash, pastDate);

    const res = await app.request("/api/projects", {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 for token without expiry", async () => {
    const noExpiryToken = generateApiToken();
    const noExpiryHash = await hashToken(noExpiryToken);
    store.saveToken("no-expiry", noExpiryHash);

    const res = await app.request("/api/projects", {
      headers: { Authorization: `Bearer ${noExpiryToken}` },
    });
    expect(res.status).toBe(200);
  });

  it("accepts token via query param", async () => {
    const res = await app.request(`/api/projects?token=${validToken}`);
    expect(res.status).toBe(200);
  });
});
