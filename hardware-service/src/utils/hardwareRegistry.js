// src/utils/hardwareRegistry.js
import { query } from "../db.js";

/**
 * Store or update heartbeat
 */
export async function registerHeartbeat({
  terminal_uid,
  store_id,
  hardware_url,
  agent_secret
}) {
  await query(
    `
    INSERT INTO active_terminals
      (store_id, terminal_uid, hardware_url, agent_secret, last_seen_at)
    VALUES
      ($1, $2, $3, $4, NOW())
    ON CONFLICT (store_id)
    DO UPDATE SET
      terminal_uid = EXCLUDED.terminal_uid,
      hardware_url = EXCLUDED.hardware_url,
      agent_secret = EXCLUDED.agent_secret,
      last_seen_at = NOW()
    `,
    [store_id, terminal_uid, hardware_url, agent_secret]
  );

  return true;
}

export async function cleanupStaleTerminals() {
  await query(`
    DELETE FROM active_terminals
    WHERE last_seen_at < NOW() - INTERVAL '5 minutes'
  `);
}

/**
 * Get active terminal (5-minute TTL)
 */
export async function getActiveTerminalForStore(store_id) {
  const { rows } = await query(
    `
    SELECT terminal_uid, hardware_url, agent_secret, last_seen_at
    FROM active_terminals
    WHERE store_id = $1
      AND last_seen_at > NOW() - INTERVAL '5 minutes'
    `,
    [store_id]
  );

  return rows[0] || null;
}
