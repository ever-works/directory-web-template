import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Use a dummy URL if DATABASE_URL is not set (DB is optional for this project)
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
