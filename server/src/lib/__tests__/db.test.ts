import { Database } from "bun:sqlite";
import { describe, expect, it } from "vitest";
import { runMigrations } from "../migrations.js";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

describe("runMigrations", () => {
  it("creates schema_version table", () => {
    const db = createTestDb();
    runMigrations(db);

    const row = db.query("SELECT version FROM schema_version").get() as { version: number };
    expect(row.version).toBeGreaterThanOrEqual(1);
  });

  it("creates all core tables", () => {
    const db = createTestDb();
    runMigrations(db);

    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
      name: string;
    }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("webhook_events");
    expect(tableNames).toContain("notifications");
    expect(tableNames).toContain("project_settings");
    expect(tableNames).toContain("deploy_history");
    expect(tableNames).toContain("audit_log");
    expect(tableNames).toContain("schema_version");
  });

  it("is idempotent — running twice does not fail", () => {
    const db = createTestDb();
    runMigrations(db);
    runMigrations(db);

    const row = db.query("SELECT version FROM schema_version").get() as { version: number };
    expect(row.version).toBeGreaterThanOrEqual(1);
  });

  it("creates indexes", () => {
    const db = createTestDb();
    runMigrations(db);

    const indexes = db.query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all() as {
      name: string;
    }[];

    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain("idx_webhook_events_project");
    expect(indexNames).toContain("idx_webhook_events_timestamp");
    expect(indexNames).toContain("idx_notifications_read");
    expect(indexNames).toContain("idx_deploy_history_project");
    expect(indexNames).toContain("idx_deploy_history_env");
    expect(indexNames).toContain("idx_audit_log_resource");
  });
});
