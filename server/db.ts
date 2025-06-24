import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless WebSocket usage with better error handling
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with proper error handling and connection limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduce concurrent connections for better stability
  maxUses: 5000, // Reduce connection reuse
  maxLifetimeSeconds: 300, // 5 minutes max lifetime for better cleanup
  idleTimeoutMillis: 30000 // 30 seconds idle timeout
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });