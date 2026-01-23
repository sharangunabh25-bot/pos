import fs from "fs";
import path from "path";
import crypto from "crypto";

export const CONFIG_PATH = path.resolve("./config.json");

let config = {
  version: 1,
  terminal_uid: null,
  agent_secret: null,
  store_id: null,
  cloud_url: "https://pos-agent-33ky.onrender.com",
  registered: false,
  approved: false,
  created_at: null,
  last_boot_at: null
};

// Load existing config if present
if (fs.existsSync(CONFIG_PATH)) {
  const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  config = { ...config, ...loaded };
}

// Generate identity if missing
if (!config.terminal_uid || !config.agent_secret) {
  config.terminal_uid = "TERM-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  config.agent_secret = crypto.randomBytes(32).toString("hex");
  config.created_at = new Date().toISOString();

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log("���� New terminal identity created:", config.terminal_uid);
}

// Update boot timestamp
config.last_boot_at = new Date().toISOString();
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

export { config };
