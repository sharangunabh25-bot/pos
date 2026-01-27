import app from "./server.js";
import fs from "fs";
import path from "path";
import { registerTerminal } from "./register.js";
import { config } from "./config.js";
import { heartbeat } from "./heartbeat.js"; // ✅ ADD THIS

// ==============================
// CONFIG
// ==============================
const PORT = 3001;
const LOG_FILE = path.resolve("./hardware-agent.log");

// ==============================
// FILE LOGGER (persistent logs)
// ==============================
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

function log(...args) {
  const msg = `[${new Date().toISOString()}] ${args.join(" ")}`;
  logStream.write(msg + "\n");
  process.stdout.write(msg + "\n");
}

function logError(...args) {
  const msg = `[${new Date().toISOString()}] [ERROR] ${args.join(" ")}`;
  logStream.write(msg + "\n");
  process.stderr.write(msg + "\n");
}

// Override console globally for consistency
console.log = log;
console.error = logError;

// ==============================
// GLOBAL CRASH PROTECTION
// ==============================
process.on("uncaughtException", err => {
  console.error("Uncaught Exception:", err?.stack || err?.message || err);
  process.exit(1);
});

process.on("unhandledRejection", err => {
  console.error("Unhandled Rejection:", err?.stack || err?.message || err);
  process.exit(1);
});

// ==============================
// BOOT SEQUENCE
// ==============================
async function boot() {
  console.log("���� Booting POS Hardware Agent...");
  console.log("���� Terminal ID:", config.terminal_uid); // ✅ FIXED
  console.log("☁️ Cloud URL:", config.cloud_url || "NOT SET");

  let approved = false;

  try {
    approved = await registerTerminal();
  } catch (err) {
    console.error("Registration fatal error:", err?.stack || err?.message || err);
  }

  if (!approved) {
    console.log("���� Agent running in LOCKED mode");
    console.log("   ⛔ Hardware endpoints are disabled");
    console.log("   ⏳ Waiting for store assignment / approval");
  } else {
    console.log("���� Agent UNLOCKED — hardware access enabled");
    console.log("���� Store ID:", config.store_id);

    // ==============================
    // START HEARTBEAT TO CLOUD ✅
    // ==============================
    heartbeat();
  }

  // ==============================
  // START HTTP SERVER
  // ==============================
  const server = app.listen(PORT, () => {
    console.log("����️ POS Hardware Service started");
    console.log(`���� HTTP server running on port ${PORT}`);
  });

  // ==============================
  // GRACEFUL SHUTDOWN (Servy / Windows)
  // ==============================
  function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });

    // Force exit if it hangs
    setTimeout(() => {
      console.error("Force exiting after 5s...");
      process.exit(1);
    }, 5000);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGHUP", shutdown);
}

// ==============================
// START
// ==============================
boot();
