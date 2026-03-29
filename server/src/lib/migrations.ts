import type { Database } from "bun:sqlite";

interface Migration {
  version: number;
  description: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Create core tables",
    sql: `
      CREATE TABLE IF NOT EXISTS webhook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        project TEXT NOT NULL,
        data TEXT NOT NULL DEFAULT '{}',
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        project TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS project_settings (
        name TEXT PRIMARY KEY,
        settings TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS deploy_history (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        environment TEXT NOT NULL,
        version TEXT NOT NULL,
        commit_sha TEXT NOT NULL DEFAULT '',
        branch TEXT NOT NULL DEFAULT '',
        timestamp TEXT NOT NULL,
        coverage REAL NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'unknown',
        action TEXT NOT NULL DEFAULT 'deploy',
        triggered_by TEXT NOT NULL DEFAULT 'unknown'
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '{}',
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'system'
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_events_project ON webhook_events(project);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp ON webhook_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_deploy_history_project ON deploy_history(project);
      CREATE INDEX IF NOT EXISTS idx_deploy_history_env ON deploy_history(environment);
      CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource);
    `,
  },
  {
    version: 2,
    description: "Create auth_tokens table",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        token_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );
    `,
  },
  {
    version: 3,
    description: "Add expires_at to auth_tokens",
    sql: `
      ALTER TABLE auth_tokens ADD COLUMN expires_at TEXT;
    `,
  },
];

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL DEFAULT 0
    )
  `);

  const row = db.query("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | null;

  let currentVersion: number;
  if (!row) {
    db.exec("INSERT INTO schema_version (version) VALUES (0)");
    currentVersion = 0;
  } else {
    currentVersion = row.version;
  }

  const pending = migrations.filter((m) => m.version > currentVersion);

  const updateVersion = db.prepare("UPDATE schema_version SET version = $version");

  for (const migration of pending) {
    db.exec(migration.sql);
    updateVersion.run({ $version: migration.version });
  }
}
