// src/utils/hardwareRegistry.js
import fs from "fs";
import path from "path";

const REGISTRY_PATH = path.resolve("./hardware-registry.json");

function readRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeRegistry(data) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
}

/* ----------------------------------------------------
   Register heartbeat
---------------------------------------------------- */
export async function registerHeartbeat({
  terminal_uid,
  store_id,
  hardware_url,
  agent_secret
}) {
  const registry = readRegistry();

  registry[store_id] = {
    terminal_uid,
    hardware_url,
    agent_secret,
    last_seen_at: new Date().toISOString()
  };

  writeRegistry(registry);
  return true;
}

/* ----------------------------------------------------
   Resolve active terminal
---------------------------------------------------- */
export async function getActiveTerminalForStore(store_id) {
  const registry = readRegistry();
  const entry = registry[store_id];

  if (!entry) return null;

  const lastSeen = new Date(entry.last_seen_at).getTime();
  if (Date.now() - lastSeen > 5 * 60 * 1000) {
    delete registry[store_id];
    writeRegistry(registry);
    return null;
  }

  return entry;
}
