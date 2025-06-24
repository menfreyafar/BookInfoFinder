import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

// Use SQLite for development/migration purposes
const dbPath = path.join(process.cwd(), 'database.sqlite');
const sqlite = new Database(dbPath);

// Enable foreign key constraints
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Export a placeholder pool for compatibility
export const pool = {
  on: () => {},
  end: () => sqlite.close()
};