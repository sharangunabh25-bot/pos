// src/db.js
import pkg from "pg";

const { Pool } = pkg;

/**
 * ----------------------------------------------------
 * Configuration
 * ----------------------------------------------------
 * Set DATABASE_URL in Render / env when you actually
 * want cloud DB behavior.
 *
 * If DATABASE_URL is NOT set → db.query() becomes a
 * safe stub that throws a clear error.
 * ----------------------------------------------------
 */

const DATABASE_URL = process.env.DATABASE_URL || null;

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl:
      DATABASE_URL.includes("localhost") ||
      DATABASE_URL.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false }
  });

  pool.on("connect", () => {
    console.log("����️ Connected to Postgres database");
  });

  pool.on("error", (err) => {
    console.error("❌ Postgres pool error:", err.message);
  });
} else {
  console.warn("⚠️ DATABASE_URL not set — running in agent-only mode (no DB)");
}

/**
 * ----------------------------------------------------
 * Public DB API
 * ----------------------------------------------------
 */

export const db = {
  /**
   * Execute a SQL query
   */
  async query(sql, params = []) {
    if (!pool) {
      throw new Error(
        "DB is not configured. DATABASE_URL is missing. " +
        "This agent is running in standalone mode."
      );
    }

    return pool.query(sql, params);
  },

  /**
   * Graceful shutdown
   */
  async close() {
    if (pool) {
      await pool.end();
      console.log("���� Postgres pool closed");
    }
  }
};
