// src/routes/cloudPrinter.routes.js
import express from "express";
import fetch from "node-fetch";

import {
  registerHeartbeat,
  getActiveTerminalForStore
} from "../utils/hardwareRegistry.js";

const router = express.Router();

/* ----------------------------------------------------
   HEARTBEAT — hardware agent calls this
---------------------------------------------------- */
router.post("/heartbeat", async (req, res) => {
  try {
    const terminal_uid = req.headers["x-terminal-id"];
    const agent_secret = req.headers["x-agent-secret"];

    const { store_id, hardware_url } = req.body;

    if (!terminal_uid || !agent_secret) {
      return res.status(401).json({
        success: false,
        message: "Missing authentication headers"
      });
    }

    if (!store_id || !hardware_url) {
      return res.status(400).json({
        success: false,
        message: "store_id and hardware_url are required"
      });
    }

    await registerHeartbeat({
      terminal_uid,
      store_id,
      hardware_url,
      agent_secret
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Heartbeat error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ----------------------------------------------------
   CLOUD → HARDWARE PROXY — printer list
---------------------------------------------------- */
router.get("/printer/list", async (req, res) => {
  try {
    const store_id = req.headers["x-store-id"];

    if (!store_id) {
      return res.status(400).json({
        success: false,
        message: "Missing x-store-id header"
      });
    }

    const terminal = await getActiveTerminalForStore(store_id);

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "No active terminal for store"
      });
    }

    const { terminal_uid, hardware_url, agent_secret } = terminal;

    const hardwareRes = await fetch(
      `${hardware_url}/api/printer/list`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-terminal-id": terminal_uid,
          "x-agent-secret": agent_secret
        }
      }
    );

    const data = await hardwareRes.json();

    res.status(hardwareRes.status).json(data);
  } catch (err) {
    console.error("Cloud printer list error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
