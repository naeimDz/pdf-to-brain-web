import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Ensure we have a database file. 
// In dev, usually local root. In prod, maybe specific generic path.
const dbPath = process.env.DATABASE_URL || 'sqlite.db';

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Helper to confirm connection
console.log(`📦 SQLite Database connected at: ${dbPath}`);
