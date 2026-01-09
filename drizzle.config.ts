import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default {
    schema: "./lib/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DATABASE_URL || "sqlite.db",
    },
} satisfies Config;
