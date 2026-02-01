// src/routes/cloudPrinter.routes.js
import express from "express";
import fetch from "node-fetch";
import {
  registerHeartbeat,
  getActiveTerminalForStore
} from "../utils/hardwareRegistry.js";

const router = express.Router();

/* ----------------------------------------------------
   HEARTBEAT (hardware → cloud)
---------------------------------------------------- */
router.post("/heartbeat", async (req, res) => {
  console.log("���� [HEARTBEAT] Incoming heartbeat request");

  try {
    const terminal_uid = req.headers["x-terminal-id"];
    const agent_secret = req.headers["x-agent-secret"];
    const { store_id, hardware_url } = req.body;

    console.log("���� [HEARTBEAT] Headers:", {
      terminal_uid,
      agent_secret: agent_secret ? "PRESENT" : "MISSING"
    });

    console.log("���� [HEARTBEAT] Body:", { store_id, hardware_url });

    if (!terminal_uid || !agent_secret) {
      console.error("❌ [HEARTBEAT] Missing auth headers");
      return res.status(401).json({
        success: false,
        message: "Missing authentication headers"
      });
    }

    if (!store_id || !hardware_url) {
      console.error("❌ [HEARTBEAT] Missing store_id or hardware_url");
      return res.status(400).json({
        success: false,
        message: "store_id and hardware_url are required"
      });
    }

    console.log("���� [HEARTBEAT] Registering / updating terminal in registry");

    await registerHeartbeat({
      terminal_uid,
      store_id,
      hardware_url,
      agent_secret
    });

    console.log("✅ [HEARTBEAT] Terminal registered successfully");

    res.json({ success: true });

  } catch (err) {
    console.error("���� [HEARTBEAT] Unexpected error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ----------------------------------------------------
   CLOUD → HARDWARE (printer list)
---------------------------------------------------- */
router.get("/printer/list", async (req, res) => {
  console.log("☁️➡️����️ [CLOUD] Printer list request received");

  try {
    const store_id = req.headers["x-store-id"];

    console.log("☁️ [CLOUD] x-store-id:", store_id);

    if (!store_id) {
      console.error("❌ [CLOUD] Missing x-store-id header");
      return res.status(400).json({
        success: false,
        message: "Missing x-store-id"
      });
    }

    console.log("���� [CLOUD] Looking up active terminal for store:", store_id);

    const terminal = await getActiveTerminalForStore(store_id);

    if (!terminal) {
      console.error("❌ [CLOUD] No active terminal found for store:", store_id);
      return res.status(404).json({
        success: false,
        message: "No active terminal for store"
      });
    }

    const { terminal_uid, hardware_url, agent_secret } = terminal;

    console.log("���� [CLOUD] Active terminal found:", {
      terminal_uid,
      hardware_url
    });

    const targetUrl = `${hardware_url}/api/printer/list`;
    console.log("���� [CLOUD] Forwarding request to hardware:", targetUrl);

    let hardwareRes;
    try {
      hardwareRes = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-terminal-id": terminal_uid,
          "x-agent-secret": agent_secret
        },
        timeout: 8000
      });
    } catch (networkErr) {
      console.error("���� [CLOUD] Failed to reach hardware agent:", networkErr);
      return res.status(502).json({
        success: false,
        message: "Hardware agent unreachable",
        error: networkErr.message
      });
    }

    console.log("���� [CLOUD] Hardware response status:", hardwareRes.status);

    let data;
    try {
      data = await hardwareRes.json();
    } catch (parseErr) {
      console.error("���� [CLOUD] Failed to parse hardware response:", parseErr);
      return res.status(502).json({
        success: false,
        message: "Invalid response from hardware agent"
      });
    }

    console.log("✅ [CLOUD] Hardware response received successfully");

    res.status(hardwareRes.status).json(data);

  } catch (err) {
    console.error("���� [CLOUD] Unexpected error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
