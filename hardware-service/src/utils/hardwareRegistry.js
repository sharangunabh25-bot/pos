import { query } from "../db.js";

/**
 * Register / update heartbeat from hardware agent
 */
export async function registerHeartbeat({
  terminal_uid,
  store_id,
  hardware_url,
  agent_secret
}) {
  await query(
    `
    INSERT INTO active_terminals (
      store_id,
      terminal_uid,
      hardware_url,
      agent_secret,
      last_seen_at
    )
    VALUES ($1, $2, $3, $4, NOW())
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

/**
 * Get active terminal for store (last 5 minutes)
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
import { query } from "../db.js";

/**
 * Register / update heartbeat from hardware agent
 */
export async function registerHeartbeat({
  terminal_uid,
  store_id,
  hardware_url,
  agent_secret
}) {
  await query(
    `
    INSERT INTO active_terminals (
      store_id,
      terminal_uid,
      hardware_url,
      agent_secret,
      last_seen_at
    )
    VALUES ($1, $2, $3, $4, NOW())
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

/**
 * Get active terminal for store (last 5 minutes)
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
