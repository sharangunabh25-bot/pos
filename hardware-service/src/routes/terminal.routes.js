// src/routes/terminal.routes.js
import express from "express";
import os from "os";
import crypto from "crypto";
import fs from "fs";

import { config, CONFIG_PATH } from "../config.js";
import { verifyAgent } from "../middleware/auth.js";

import { requireRegisteredTerminal } from "../middleware/requireRegisteredTerminal.js";
import { requireOperationalTerminal } from "../middleware/requireOperationalTerminal.js";

import { db } from "../db.js"; // adjust path if needed

const router = express.Router();

/* ----------------------------------------------------
   Public: Who Am I (Local debug only)
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
   Cloud → Agent: Approve Terminal
---------------------------------------------------- */

router.post("/approve", verifyAgent, (req, res) => {
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

  console.log("✅ Terminal approved by cloud");
  console.log("���� Store ID:", store_id);

  res.json({
    success: true,
    message: "Terminal approved",
    terminal_uid: config.terminal_uid,
    store_id
  });
});

/* ----------------------------------------------------
   Cloud → Agent: Lock Terminal
---------------------------------------------------- */

router.post("/lock", verifyAgent, (req, res) => {
  const updated = {
    ...config,
    approved: false
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  Object.assign(config, updated);

  console.log("���� Terminal locked by cloud");

  res.json({
    success: true,
    message: "Terminal locked"
  });
});

/* ----------------------------------------------------
   Cloud → Agent: Rotate Secret
---------------------------------------------------- */

router.post("/rotate-secret", verifyAgent, (req, res) => {
  const newSecret = crypto.randomBytes(32).toString("hex");

  const updated = {
    ...config,
    agent_secret: newSecret
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  Object.assign(config, updated);

  console.log("���� Agent secret rotated");

  res.json({
    success: true,
    message: "Secret rotated",
    terminal_uid: config.terminal_uid
  });
});

/* ----------------------------------------------------
   Cloud → Agent: Health Ping
---------------------------------------------------- */

router.get("/status", verifyAgent, (req, res) => {
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

/* ----------------------------------------------------
   Cloud → Agent: Register Terminal (bootstrap)
   Uses requireRegisteredTerminal (NOT operational)
---------------------------------------------------- */

router.post(
  "/register",
  requireRegisteredTerminal,
  async (req, res) => {
    const { terminal_id } = req.body;

    if (!terminal_id) {
      return res.status(400).json({
        success: false,
        message: "Missing terminal_id"
      });
    }

    // 1. Lookup terminal in cloud DB
    const existing = await db.query(
      "SELECT * FROM terminals WHERE terminal_id = $1",
      [terminal_id]
    );

    let terminal = existing.rows[0];

    // 2. First contact → create LOCKED terminal row
    if (!terminal) {
      const insert = await db.query(
        `INSERT INTO terminals (terminal_id, approved)
         VALUES ($1, false)
         RETURNING *`,
        [terminal_id]
      );

      terminal = insert.rows[0];

      return res.status(423).json({
        success: false,
        message: "Terminal created. Awaiting approval and store assignment.",
        terminal_id
      });
    }

    // 3. Not approved or no store yet
    if (!terminal.approved || !terminal.store_id) {
      return res.status(423).json({
        success: false,
        message: "Terminal is not approved or store is not assigned",
        terminal_id
      });
    }

    // 4. Approved → unlock agent locally
    const updated = {
      ...config,
      store_id: terminal.store_id,
      approved: true,
      registered: true
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
    Object.assign(config, updated);

    console.log("���� Terminal unlocked after cloud approval");

    return res.json({
      success: true,
      message: "Terminal approved and unlocked",
      terminal_id,
      store_id: terminal.store_id
    });
  }
);

export default router;
