// src/hardwareRegistry.js

const terminals = new Map();

/**
 * Called by hardware agent on boot / heartbeat
 */
export function registerTerminal({ terminal_uid, store_id, ip, agent_secret }) {
  terminals.set(terminal_uid, {
    terminal_uid,
    store_id,
    ip,
    agent_secret,
    last_seen: new Date()
  });
}

export function getTerminalByStore(store_id) {
  for (const t of terminals.values()) {
    if (t.store_id === store_id) return t;
  }
  return null;
}

export function getTerminalById(terminal_uid) {
  return terminals.get(terminal_uid) || null;
}
