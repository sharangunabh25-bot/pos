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
  console.log("���� [HEARTBEAT] Incoming heartbeat");

  try {
    const terminal_uid = req.headers["x-terminal-id"];
    const agent_secret = req.headers["x-agent-secret"];
    const { store_id, hardware_url } = req.body;

    console.log("[HEARTBEAT] Headers:", {
      terminal_uid,
      agent_secret: agent_secret ? "PRESENT" : "MISSING"
    });

    console.log("[HEARTBEAT] Body:", { store_id, hardware_url });

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

    console.log("✅ [HEARTBEAT] Terminal registered / refreshed");

    /* ✅ IMPORTANT PART (Option B) */
    return res.json({
      success: true,
      approved: true,
      store_id
    });

  } catch (err) {
    console.error("❌ [HEARTBEAT] Error:", err);
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
  console.log("☁️➡️����️ [CLOUD] Printer list request");

  try {
    const store_id = req.headers["x-store-id"];
    if (!store_id) {
      return res.status(400).json({
        success: false,
        message: "Missing x-store-id"
      });
    }

    const terminal = await getActiveTerminalForStore(store_id);

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "No active terminal"
      });
    }

    const { terminal_uid, hardware_url, agent_secret } = terminal;
    const targetUrl = `${hardware_url}/api/printer/list`;

    console.log("[CLOUD] Forwarding to:", targetUrl);

    const hardwareRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-terminal-id": terminal_uid,
        "x-agent-secret": agent_secret
      },
      timeout: 8000
    });

    const data = await hardwareRes.json();
    return res.status(hardwareRes.status).json(data);

  } catch (err) {
    console.error("❌ [CLOUD] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
