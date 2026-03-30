import type { Database } from "bun:sqlite";
import type { ProjectSettings } from "@veriel-ops/shared";
import { DEFAULT_PROJECT_TYPE, PROJECT_TYPE_CONFIG } from "@veriel-ops/shared";
import type { WebhookEvent } from "../types.js";

const DEFAULT_SETTINGS: ProjectSettings = {
  coverageThreshold: 80,
  projectType: DEFAULT_PROJECT_TYPE,
  deployTarget: PROJECT_TYPE_CONFIG[DEFAULT_PROJECT_TYPE].deployTarget,
  buildCommand: PROJECT_TYPE_CONFIG[DEFAULT_PROJECT_TYPE].defaultBuildCommand,
  outputDir: PROJECT_TYPE_CONFIG[DEFAULT_PROJECT_TYPE].defaultOutputDir,
  runtime: PROJECT_TYPE_CONFIG[DEFAULT_PROJECT_TYPE].defaultRuntime,
};

export interface Notification {
  id: string;
  type: "deploy_failed" | "deploy_success" | "coverage_low" | "workflow_failed";
  project: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AuditEntry {
  id: number;
  action: string;
  resource: string;
  detail: Record<string, unknown>;
  timestamp: string;
  actor: string;
}

export interface DbStore {
  // Webhook events
  addEvent(event: Omit<WebhookEvent, "timestamp">): void;
  getEvents(since?: string, project?: string): WebhookEvent[];
  getLastUpdated(): string;

  // Notifications
  addNotification(type: Notification["type"], project: string, message: string): void;
  getNotifications(): Notification[];
  markAsRead(id: string): boolean;
  getUnreadCount(): number;

  // Project settings
  getProjectSettings(name: string): ProjectSettings | null;
  setProjectSettings(name: string, settings: Partial<ProjectSettings>): ProjectSettings;
  deleteProjectSettings(name: string): void;

  // Audit log
  addAuditEntry(action: string, resource: string, detail?: Record<string, unknown>, actor?: string): void;
  getAuditLog(resource?: string, limit?: number): AuditEntry[];

  // Auth tokens
  saveToken(name: string, tokenHash: string, expiresAt?: string): void;
  getTokenHashes(): { name: string; hash: string; expiresAt: string | null }[];
  updateLastUsed(name: string): void;
  deleteToken(name: string): boolean;
}

export function createDbStore(db: Database): DbStore {
  // ─── Prepared statements ─────────────────────────────────────────

  const stmts = {
    insertEvent: db.prepare(
      "INSERT INTO webhook_events (source, type, project, data, timestamp) VALUES ($source, $type, $project, $data, $timestamp)",
    ),
    selectEvents: db.prepare("SELECT * FROM webhook_events ORDER BY timestamp DESC LIMIT 200"),
    selectEventsSince: db.prepare(
      "SELECT * FROM webhook_events WHERE timestamp > $since ORDER BY timestamp DESC LIMIT 200",
    ),
    selectEventsProject: db.prepare(
      "SELECT * FROM webhook_events WHERE project = $project ORDER BY timestamp DESC LIMIT 200",
    ),
    selectEventsSinceProject: db.prepare(
      "SELECT * FROM webhook_events WHERE timestamp > $since AND project = $project ORDER BY timestamp DESC LIMIT 200",
    ),
    selectLastUpdated: db.prepare("SELECT timestamp FROM webhook_events ORDER BY timestamp DESC LIMIT 1"),

    insertNotification: db.prepare(
      "INSERT INTO notifications (type, project, message, timestamp) VALUES ($type, $project, $message, $timestamp)",
    ),
    selectNotifications: db.prepare("SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50"),
    markNotificationRead: db.prepare("UPDATE notifications SET read = 1 WHERE id = $id"),
    selectUnreadCount: db.prepare("SELECT COUNT(*) as count FROM notifications WHERE read = 0"),

    selectSettings: db.prepare("SELECT settings FROM project_settings WHERE name = $name"),
    upsertSettings: db.prepare(
      "INSERT INTO project_settings (name, settings) VALUES ($name, $settings) ON CONFLICT(name) DO UPDATE SET settings = $settings",
    ),
    deleteSettings: db.prepare("DELETE FROM project_settings WHERE name = $name"),

    insertAudit: db.prepare(
      "INSERT INTO audit_log (action, resource, detail, timestamp, actor) VALUES ($action, $resource, $detail, $timestamp, $actor)",
    ),
    selectAudit: db.prepare("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $limit"),
    selectAuditByResource: db.prepare(
      "SELECT * FROM audit_log WHERE resource = $resource ORDER BY timestamp DESC LIMIT $limit",
    ),

    insertToken: db.prepare(
      "INSERT INTO auth_tokens (name, token_hash, created_at, expires_at) VALUES ($name, $tokenHash, $createdAt, $expiresAt)",
    ),
    selectTokens: db.prepare("SELECT name, token_hash, expires_at FROM auth_tokens"),
    updateTokenLastUsed: db.prepare("UPDATE auth_tokens SET last_used_at = $now WHERE name = $name"),
    deleteToken: db.prepare("DELETE FROM auth_tokens WHERE name = $name"),
  };

  // ─── Webhook events ──────────────────────────────────────────────

  function addEvent(event: Omit<WebhookEvent, "timestamp">): void {
    stmts.insertEvent.run({
      $source: event.source,
      $type: event.type,
      $project: event.project,
      $data: JSON.stringify(event.data),
      $timestamp: new Date().toISOString(),
    });
  }

  function getEvents(since?: string, project?: string): WebhookEvent[] {
    let rows: Record<string, unknown>[];

    if (since && project) {
      rows = stmts.selectEventsSinceProject.all({ $since: since, $project: project }) as Record<string, unknown>[];
    } else if (since) {
      rows = stmts.selectEventsSince.all({ $since: since }) as Record<string, unknown>[];
    } else if (project) {
      rows = stmts.selectEventsProject.all({ $project: project }) as Record<string, unknown>[];
    } else {
      rows = stmts.selectEvents.all() as Record<string, unknown>[];
    }

    return rows.map(rowToEvent);
  }

  function getLastUpdated(): string {
    const row = stmts.selectLastUpdated.get() as { timestamp: string } | null;
    return row?.timestamp ?? "";
  }

  // ─── Notifications ───────────────────────────────────────────────

  function addNotification(type: Notification["type"], project: string, message: string): void {
    stmts.insertNotification.run({
      $type: type,
      $project: project,
      $message: message,
      $timestamp: new Date().toISOString(),
    });
  }

  function getNotifications(): Notification[] {
    const rows = stmts.selectNotifications.all() as Record<string, unknown>[];
    return rows.map(rowToNotification);
  }

  function markAsRead(id: string): boolean {
    const result = stmts.markNotificationRead.run({ $id: Number(id) });
    return result.changes > 0;
  }

  function getUnreadCount(): number {
    const row = stmts.selectUnreadCount.get() as { count: number };
    return row.count;
  }

  // ─── Project settings ────────────────────────────────────────────

  function getProjectSettings(name: string): ProjectSettings | null {
    const row = stmts.selectSettings.get({ $name: name }) as { settings: string } | null;
    if (!row) return null;
    try {
      return JSON.parse(row.settings) as ProjectSettings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  function setProjectSettings(name: string, settings: Partial<ProjectSettings>): ProjectSettings {
    const current = getProjectSettings(name) ?? DEFAULT_SETTINGS;
    const updated = { ...current, ...settings };
    stmts.upsertSettings.run({
      $name: name,
      $settings: JSON.stringify(updated),
    });
    return updated;
  }

  function deleteProjectSettings(name: string): void {
    stmts.deleteSettings.run({ $name: name });
  }

  // ─── Audit log ───────────────────────────────────────────────────

  function addAuditEntry(
    action: string,
    resource: string,
    detail: Record<string, unknown> = {},
    actor = "system",
  ): void {
    stmts.insertAudit.run({
      $action: action,
      $resource: resource,
      $detail: JSON.stringify(detail),
      $timestamp: new Date().toISOString(),
      $actor: actor,
    });
  }

  function getAuditLog(resource?: string, limit = 50): AuditEntry[] {
    const rows = resource
      ? (stmts.selectAuditByResource.all({ $resource: resource, $limit: limit }) as Record<string, unknown>[])
      : (stmts.selectAudit.all({ $limit: limit }) as Record<string, unknown>[]);

    return rows.map(rowToAudit);
  }

  // ─── Row mappers ─────────────────────────────────────────────────

  function safeJsonParse(value: string): Record<string, unknown> {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  function rowToEvent(row: Record<string, unknown>): WebhookEvent {
    return {
      source: row.source as WebhookEvent["source"],
      type: row.type as string,
      project: row.project as string,
      data: safeJsonParse(row.data as string),
      timestamp: row.timestamp as string,
    };
  }

  function rowToNotification(row: Record<string, unknown>): Notification {
    return {
      id: String(row.id),
      type: row.type as Notification["type"],
      project: row.project as string,
      message: row.message as string,
      timestamp: row.timestamp as string,
      read: row.read === 1,
    };
  }

  function rowToAudit(row: Record<string, unknown>): AuditEntry {
    return {
      id: row.id as number,
      action: row.action as string,
      resource: row.resource as string,
      detail: safeJsonParse(row.detail as string),
      timestamp: row.timestamp as string,
      actor: row.actor as string,
    };
  }

  // ─── Auth tokens ──────────────────────────────────────────────────

  function saveToken(name: string, tokenHash: string, expiresAt?: string): void {
    stmts.insertToken.run({
      $name: name,
      $tokenHash: tokenHash,
      $createdAt: new Date().toISOString(),
      $expiresAt: expiresAt ?? null,
    });
  }

  function getTokenHashes(): { name: string; hash: string; expiresAt: string | null }[] {
    const rows = stmts.selectTokens.all() as { name: string; token_hash: string; expires_at: string | null }[];
    return rows.map((r) => ({ name: r.name, hash: r.token_hash, expiresAt: r.expires_at }));
  }

  function updateLastUsed(name: string): void {
    stmts.updateTokenLastUsed.run({ $name: name, $now: new Date().toISOString() });
  }

  function deleteToken(name: string): boolean {
    const result = stmts.deleteToken.run({ $name: name });
    return result.changes > 0;
  }

  return {
    addEvent,
    getEvents,
    getLastUpdated,
    addNotification,
    getNotifications,
    markAsRead,
    getUnreadCount,
    getProjectSettings,
    setProjectSettings,
    deleteProjectSettings,
    addAuditEntry,
    getAuditLog,
    saveToken,
    getTokenHashes,
    updateLastUsed,
    deleteToken,
  };
}
