import { createDatabase } from "../src/lib/db.js";
import { generateApiToken, hashToken } from "../src/lib/token.js";
import { createDbStore } from "../src/services/db-store.js";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--")) || "default";
const daysArg = args.find((a) => a.startsWith("--expires="));
const noExpiry = args.includes("--no-expiry");

const DEFAULT_EXPIRY_DAYS = 30;
const expiryDays = daysArg ? Number.parseInt(daysArg.split("=")[1], 10) : DEFAULT_EXPIRY_DAYS;

const db = createDatabase(`${import.meta.dir}/../data/veriel-ops.db`);
const store = createDbStore(db);

const existing = store.getTokenHashes();
if (existing.some((t) => t.name === name)) {
  console.error(`Token "${name}" already exists. Delete it first or use a different name.`);
  process.exit(1);
}

const token = generateApiToken();
const hash = await hashToken(token);

let expiresAt: string | undefined;
if (!noExpiry) {
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + expiryDays);
  expiresAt = expDate.toISOString();
}

store.saveToken(name, hash, expiresAt);

console.log("");
console.log(`Token "${name}" created successfully.`);
if (expiresAt) {
  console.log(`Expires: ${new Date(expiresAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`);
} else {
  console.log("Expires: never");
}
console.log("");
console.log("Save this token — it will NOT be shown again:");
console.log("");
console.log(`  ${token}`);
console.log("");
console.log("Usage:");
console.log(`  Authorization: Bearer ${token}`);
console.log("");
console.log("Options:");
console.log("  --expires=N    Token expires in N days (default: 30)");
console.log("  --no-expiry    Token never expires");
console.log("");

db.close();
