import fs from "fs";
import path from "path";
import crypto from "crypto";

export const CONFIG_PATH = path.resolve("config.json");

const DEFAULT_CLOUD_URL = "https://pos-agent-33ky.onrender.com";

// ==============================
// HELPERS
// ==============================
function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

function safeParseJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    const corruptPath = filePath + ".corrupt-" + Date.now();
    fs.renameSync(filePath, corruptPath);
    console.error("⚠️ Config corrupted. Backed up to:", corruptPath);
    return null;
  }
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ==============================
// LOAD OR CREATE CONFIG
// ==============================
let config = null;

if (!fs.existsSync(CONFIG_PATH)) {
  config = {
    version: 1,

    terminal_id: generateId("TERM"),
    store_id: null,

    agent_secret: crypto.randomBytes(32).toString("hex"),

    cloud_url: DEFAULT_CLOUD_URL,

    registered: false,
    approved: false,

    created_at: new Date().toISOString(),
    last_boot_at: new Date().toISOString()
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log("���� Generated new terminal identity:", config.terminal_id);
} else {
  const loaded = safeParseJSON(CONFIG_PATH);

  if (!loaded) {
    // Corrupt config — regenerate safely
    config = {
      version: 1,

      terminal_id: generateId("TERM"),
      store_id: null,

      agent_secret: crypto.randomBytes(32).toString("hex"),

      cloud_url: DEFAULT_CLOUD_URL,

      registered: false,
      approved: false,

      created_at: new Date().toISOString(),
      last_boot_at: new Date().toISOString()
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("���� Regenerated terminal identity:", config.terminal_id);
  } else {
    config = loaded;
  }
}

// ==============================
// HARD VALIDATION + MIGRATION
// ==============================

// Schema defaults for upgrades
if (!config.version) config.version = 1;
if (!config.registered) config.registered = false;
if (!config.approved) config.approved = false;
if (!config.last_boot_at) config.last_boot_at = new Date().toISOString();

// Critical fields must exist
if (!config.terminal_id || typeof config.terminal_id !== "string") {
  throw new Error("❌ Invalid terminal_id in config.json");
}

if (!config.agent_secret || typeof config.agent_secret !== "string") {
  throw new Error("❌ Invalid agent_secret in config.json");
}

// Validate cloud_url
if (!config.cloud_url || !isValidUrl(config.cloud_url)) {
  console.error("⚠️ Invalid cloud_url in config.json. Resetting to default.");
  config.cloud_url = DEFAULT_CLOUD_URL;
}

// Update last boot timestamp
config.last_boot_at = new Date().toISOString();

// Persist any fixes/migrations
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

// ==============================
// EXPORT LIVE CONFIG OBJECT
// ==============================
export { config };
