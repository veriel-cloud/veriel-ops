import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../lib/migrations.js";
import { createDbStore, type DbStore } from "../db-store.js";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}

let store: DbStore;

beforeEach(() => {
  store = createDbStore(createTestDb());
});

// ─── Webhook Events ──────────────────────────────────────────────────

describe("webhook events", () => {
  it("adds and retrieves events", () => {
    store.addEvent({ source: "github", type: "push", project: "my-app", data: { ref: "main" } });
    const events = store.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("github");
    expect(events[0].project).toBe("my-app");
    expect(events[0].data).toEqual({ ref: "main" });
    expect(events[0].timestamp).toBeTruthy();
  });

  it("filters events by project", () => {
    store.addEvent({ source: "github", type: "push", project: "app-a", data: {} });
    store.addEvent({ source: "github", type: "push", project: "app-b", data: {} });

    const events = store.getEvents(undefined, "app-a");
    expect(events).toHaveLength(1);
    expect(events[0].project).toBe("app-a");
  });

  it("filters events by since timestamp", () => {
    store.addEvent({ source: "github", type: "push", project: "app", data: {} });

    const futureDate = new Date(Date.now() + 60_000).toISOString();
    const events = store.getEvents(futureDate);
    expect(events).toHaveLength(0);
  });

  it("returns lastUpdated from most recent event", () => {
    expect(store.getLastUpdated()).toBe("");
    store.addEvent({ source: "github", type: "push", project: "app", data: {} });
    expect(store.getLastUpdated()).toBeTruthy();
  });
});

// ─── Notifications ───────────────────────────────────────────────────

describe("notifications", () => {
  it("adds and retrieves notifications", () => {
    store.addNotification("deploy_failed", "my-app", "Deploy failed");
    const notifications = store.getNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("deploy_failed");
    expect(notifications[0].project).toBe("my-app");
    expect(notifications[0].message).toBe("Deploy failed");
    expect(notifications[0].read).toBe(false);
  });

  it("marks notification as read", () => {
    store.addNotification("deploy_failed", "my-app", "Deploy failed");
    const notifications = store.getNotifications();
    const id = notifications[0].id;

    const result = store.markAsRead(id);
    expect(result).toBe(true);

    const updated = store.getNotifications();
    expect(updated[0].read).toBe(true);
  });

  it("returns false for non-existent notification", () => {
    expect(store.markAsRead("999")).toBe(false);
  });

  it("counts unread notifications", () => {
    store.addNotification("deploy_failed", "app-a", "Failed A");
    store.addNotification("deploy_success", "app-b", "Success B");
    expect(store.getUnreadCount()).toBe(2);

    const id = store.getNotifications()[0].id;
    store.markAsRead(id);
    expect(store.getUnreadCount()).toBe(1);
  });
});

// ─── Project Settings ────────────────────────────────────────────────

describe("project settings", () => {
  it("returns null for non-existent project", () => {
    expect(store.getProjectSettings("unknown")).toBeNull();
  });

  it("sets and retrieves settings", () => {
    store.setProjectSettings("my-app", { coverageThreshold: 90 });
    const settings = store.getProjectSettings("my-app");
    expect(settings).toMatchObject({ coverageThreshold: 90 });
  });

  it("merges partial settings with defaults", () => {
    const settings = store.setProjectSettings("my-app", {});
    expect(settings.coverageThreshold).toBe(80);
  });

  it("updates existing settings", () => {
    store.setProjectSettings("my-app", { coverageThreshold: 70 });
    store.setProjectSettings("my-app", { coverageThreshold: 95 });
    const settings = store.getProjectSettings("my-app");
    expect(settings?.coverageThreshold).toBe(95);
  });

  it("deletes settings", () => {
    store.setProjectSettings("my-app", { coverageThreshold: 80 });
    store.deleteProjectSettings("my-app");
    expect(store.getProjectSettings("my-app")).toBeNull();
  });
});

// ─── Audit Log ───────────────────────────────────────────────────────

describe("audit log", () => {
  it("adds and retrieves audit entries", () => {
    store.addAuditEntry("deploy", "my-app", { environment: "pro" });
    const log = store.getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("deploy");
    expect(log[0].resource).toBe("my-app");
    expect(log[0].detail).toEqual({ environment: "pro" });
    expect(log[0].actor).toBe("system");
  });

  it("filters by resource", () => {
    store.addAuditEntry("deploy", "app-a");
    store.addAuditEntry("deploy", "app-b");
    const log = store.getAuditLog("app-a");
    expect(log).toHaveLength(1);
    expect(log[0].resource).toBe("app-a");
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      store.addAuditEntry("deploy", "app");
    }
    const log = store.getAuditLog(undefined, 3);
    expect(log).toHaveLength(3);
  });

  it("uses custom actor", () => {
    store.addAuditEntry("deploy", "app", {}, "dashboard-user");
    const log = store.getAuditLog();
    expect(log[0].actor).toBe("dashboard-user");
  });
});
