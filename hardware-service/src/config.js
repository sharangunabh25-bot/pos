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
  last_boot_at: null,

  /** Scale (Datalogic Magellan 9300i / Remote Weight 8300RD) */
  scale_serial_path: process.env.SCALE_SERIAL_PATH || "COM3",
  scale_baud_rate: Number(process.env.SCALE_BAUD_RATE) || 9600,

  /** Cash drawer (M-S CF-405BX-M-B) - serial port or empty to use printer kick */
  cash_drawer_serial_path: process.env.CASH_DRAWER_SERIAL_PATH || "",

  /** Barcode scanner (Zebra DS2278) - HID; no config required for keyboard-mode */
  /** Payment terminal (PAX A35) - PAX SDK bridge */
  pax_enabled: process.env.PAX_ENABLED === "true",
  pax_bridge_url: process.env.PAX_BRIDGE_URL || "http://localhost:7001",
  pax_terminal_id: process.env.PAX_TERMINAL_ID || null,
  pax_timeout_ms: Number(process.env.PAX_TIMEOUT_MS) || 30000,
  /** POS Keyboard (Cherry SPOS) / Touchscreen (Planar) - input/display */
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
  console.log("���� New hardware terminal identity created:", config.terminal_uid);
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
   ⚠️ TEMP DEBUG — REMOVE AFTER COPYING SECRET
---------------------------------------------------- */
console.log("���� HARDWARE AGENT SECRET:", config.agent_secret);
console.log("����️ HARDWARE TERMINAL UID:", config.terminal_uid);

export { config };
