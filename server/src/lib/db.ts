import { Database } from "bun:sqlite";
import { runMigrations } from "./migrations.js";

export type { Database } from "bun:sqlite";

export function createDatabase(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  runMigrations(db);

  return db;
}

export function createMemoryDatabase(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}
