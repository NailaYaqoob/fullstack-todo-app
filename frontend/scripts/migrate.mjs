// Run Better Auth database migrations to create user/session/account/verification tables
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { getMigrations } from "better-auth/db";
import { jwt } from "better-auth/plugins/jwt";
import pkg from "pg";
const { Pool } = pkg;

const secret = process.env.BETTER_AUTH_SECRET;
const dbUrl = process.env.DATABASE_URL;

if (!secret) throw new Error("BETTER_AUTH_SECRET not set — run with --env-file=.env.local");
if (!dbUrl)  throw new Error("DATABASE_URL not set — run with --env-file=.env.local");

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations({
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 604800, updateAge: 86400 },
  plugins: [jwt({ jwks: { keyPairConfig: { alg: "ES256" } }, jwt: { expirationTime: "15m" } })],
});

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log("✅ Better Auth schema already up-to-date — nothing to migrate.");
  process.exit(0);
}

console.log("Tables to create:", toBeCreated.map(t => t.table));
console.log("Columns to add:",   toBeAdded.map(t => `${t.table}: ${Object.keys(t.fields).join(", ")}`));

await runMigrations();
console.log("✅ Better Auth migration complete.");
process.exit(0);
