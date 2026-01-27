// src/routes/terminal.routes.js
import express from "express";
import os from "os";
import crypto from "crypto";
import fs from "fs";

import { config, CONFIG_PATH } from "../config.js";
import { verifyCloudAgent } from "../middleware/verifyCloudAgent.js";
import { requireRegisteredTerminal } from "../middleware/requireRegisteredTerminal.js";

const router = express.Router();

/* ----------------------------------------------------
   PUBLIC — no middleware
---------------------------------------------------- */

router.get("/whoami", (req, res) => {
  res.json({
    terminal_uid: config.terminal_uid || null,
    store_id: config.store_id || null,
    approved: config.approved || false,
    registered: config.registered || false,
    hostname: os.hostname(),
    platform: os.platform()
  });
});

/* ----------------------------------------------------
   BOOTSTRAP — identity only
---------------------------------------------------- */

router.post("/register", requireRegisteredTerminal, async (req, res) => {
  const { terminal_id } = req.body;

  if (!terminal_id) {
    return res.status(400).json({
      success: false,
      message: "Missing terminal_id"
    });
  }

  if (terminal_id !== config.terminal_uid) {
    return res.status(401).json({
      success: false,
      message: "terminal_id does not match this agent"
    });
  }

  if (!config.approved || !config.store_id) {
    return res.status(423).json({
      success: false,
      message: "Terminal is not approved or store is not assigned",
      terminal_id
    });
  }

  const updated = {
    ...config,
    registered: true
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  Object.assign(config, updated);

  return res.json({
    success: true,
    message: "Terminal approved and unlocked",
    terminal_id,
    store_id: config.store_id
  });
});

/* ----------------------------------------------------
   CLOUD → AGENT — cryptographic auth
---------------------------------------------------- */

router.post("/approve", verifyCloudAgent, (req, res) => {
  const { store_id } = req.body;

  if (!store_id) {
    return res.status(400).json({
      success: false,
      message: "store_id is required"
    });
  }

  const updated = {
    ...config,
    store_id,
    approved: true,
    registered: true
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  Object.assign(config, updated);

  res.json({
    success: true,
    message: "Terminal approved",
    terminal_uid: config.terminal_uid,
    store_id
  });
});

router.get("/status", verifyCloudAgent, (req, res) => {
  res.json({
    success: true,
    terminal_uid: config.terminal_uid,
    store_id: config.store_id,
    approved: config.approved,
    registered: config.registered,
    hostname: os.hostname(),
    platform: os.platform(),
    uptime_sec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

export default router;
