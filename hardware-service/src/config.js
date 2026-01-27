// src/config.js
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

/* ----------------------------------------------------
   Load existing config if present
---------------------------------------------------- */

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    config = { ...config, ...loaded };
  } catch (err) {
    console.error("❌ Failed to parse config.json:", err.message);
    process.exit(1);
  }
}

/* ----------------------------------------------------
   Generate identity if missing
---------------------------------------------------- */

let identityCreated = false;

if (!config.terminal_uid) {
  config.terminal_uid =
    "TERM-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  identityCreated = true;
}

if (!config.agent_secret) {
  config.agent_secret = crypto.randomBytes(32).toString("hex");
  identityCreated = true;
}

if (!config.created_at) {
  config.created_at = new Date().toISOString();
}

/* ----------------------------------------------------
   Persist identity if newly created
---------------------------------------------------- */

if (identityCreated) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log("���� New terminal identity created:", config.terminal_uid);
}

/* ----------------------------------------------------
   Update boot timestamp (every start)
---------------------------------------------------- */

config.last_boot_at = new Date().toISOString();

try {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
} catch (err) {
  console.error("❌ Failed to persist config.json:", err.message);
  process.exit(1);
}

/* ----------------------------------------------------
   TEMP DEBUG — REMOVE AFTER COPYING SECRET
---------------------------------------------------- */

console.log("���� RENDER AGENT SECRET:", config.agent_secret);
console.log("���� RENDER TERMINAL UID:", config.terminal_uid);

export { config };
