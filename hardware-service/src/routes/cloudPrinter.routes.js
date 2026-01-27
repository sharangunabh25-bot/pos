// src/routes/cloudPrinter.routes.js
import express from "express";
import fetch from "node-fetch";
import { config } from "../config.js";
import { registerHeartbeat, getActiveTerminalForStore } from "../hardwareRegistry.js";

const router = express.Router();

/* ----------------------------------------------------
   HEARTBEAT — hardware → cloud
---------------------------------------------------- */
router.post("/heartbeat", async (req, res) => {
  const { store_id, hardware_url } = req.body;

  if (!store_id || !hardware_url) {
    return res.status(400).json({
      success: false,
      message: "store_id and hardware_url are required"
    });
  }

  await registerHeartbeat({
    terminal_uid: config.terminal_uid,
    store_id,
    hardware_url
  });

  return res.json({
    success: true,
    message: "Heartbeat registered",
    terminal_uid: config.terminal_uid,
    store_id,
    hardware_url
  });
});

/* ----------------------------------------------------
   CLOUD → HARDWARE : LIST PRINTERS
---------------------------------------------------- */
router.get("/printer/list", async (req, res) => {
  const storeId = req.headers["x-store-id"];

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "x-store-id header is required"
    });
  }

  const terminal = await getActiveTerminalForStore(storeId);

  if (!terminal) {
    return res.status(404).json({
      success: false,
      message: "No active terminal for store"
    });
  }

  const resp = await fetch(`${terminal.hardware_url}/api/printer/list`, {
    headers: {
      "x-terminal-id": terminal.terminal_uid,
      "x-agent-secret": config.agent_secret
    }
  });

  const data = await resp.json();
  return res.json(data);
});

/* ----------------------------------------------------
   CLOUD → HARDWARE : PRINT
---------------------------------------------------- */
router.post("/printer/print", async (req, res) => {
  const storeId = req.headers["x-store-id"];

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "x-store-id header is required"
    });
  }

  const terminal = await getActiveTerminalForStore(storeId);

  if (!terminal) {
    return res.status(404).json({
      success: false,
      message: "No active terminal for store"
    });
  }

  const resp = await fetch(`${terminal.hardware_url}/api/printer/print`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-terminal-id": terminal.terminal_uid,
      "x-agent-secret": config.agent_secret
    },
    body: JSON.stringify(req.body)
  });

  const data = await resp.json();
  return res.json(data);
});

export default router;
