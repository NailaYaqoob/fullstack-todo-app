import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    jwt({
      jwks: {
        // ES256 — supported by python-jose for FastAPI verification
        keyPairConfig: { alg: "ES256" },
      },
      jwt: {
        expirationTime: "15m",
      },
    }),
  ],
  session: {
    expiresIn: 604800,   // 7 days
    updateAge: 86400,    // refresh daily
  },
});
