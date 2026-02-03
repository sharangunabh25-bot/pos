import express from "express";
import fetch from "node-fetch";
import {
  registerHeartbeat,
  getActiveTerminalForStore
} from "../utils/hardwareRegistry.js";
import logger from "../utils/logger.js";

const router = express.Router();

/* ====================================================
   HEARTBEAT (hardware → cloud)
==================================================== */
router.post("/heartbeat", async (req, res) => {
  console.log("���� [HEARTBEAT] Request received");

  try {
    // -------- Step 1: Read headers --------
    const terminal_uid = req.headers["x-terminal-id"];
    const agent_secret = req.headers["x-agent-secret"];

    console.log("���� [HEARTBEAT] Headers parsed:", {
      terminal_uid,
      agent_secret: agent_secret ? "PRESENT" : "MISSING"
    });

    // -------- Step 2: Read body --------
    const { store_id, hardware_url } = req.body;

    console.log("���� [HEARTBEAT] Body parsed:", {
      store_id,
      hardware_url
    });

    // -------- Step 3: Validate headers --------
    if (!terminal_uid || !agent_secret) {
      console.error("❌ [HEARTBEAT] Missing auth headers");
      return res.status(401).json({
        success: false,
        message: "Missing authentication headers"
      });
    }

    // -------- Step 4: Validate body --------
    if (!store_id || !hardware_url) {
      console.error("❌ [HEARTBEAT] Missing store_id or hardware_url");
      return res.status(400).json({
        success: false,
        message: "store_id and hardware_url are required"
      });
    }

    // -------- Step 5: Persist heartbeat --------
    console.log("���� [HEARTBEAT] Writing heartbeat to registry");

    await registerHeartbeat({
      terminal_uid,
      store_id,
      hardware_url,
      agent_secret
    });

    console.log("✅ [HEARTBEAT] Terminal registered / refreshed", {
      terminal_uid,
      store_id
    });

    // -------- Step 6: ACK --------
    return res.json({
      success: true,
      approved: true,
      store_id
    });

  } catch (err) {
    console.error("���� [HEARTBEAT] Unhandled exception", {
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ====================================================
   CLOUD → HARDWARE (printer list)
==================================================== */
/**
 * Handles GET printer list: requires x-store-id, forwards to active hardware terminal.
 * @param {express.Request} req
 * @param {express.Response} res
 */
async function handlePrinterList(req, res) {
  console.log("����️ [CLOUD] Printer list request received");

  try {
    // -------- Step 1: Read store header --------
    const store_id = req.headers["x-store-id"];
    console.log("���� [CLOUD] x-store-id:", store_id);

    if (!store_id) {
      console.error("❌ [CLOUD] Missing x-store-id header");
      return res.status(400).json({
        success: false,
        message: "Missing x-store-id"
      });
    }

    // -------- Step 2: Lookup terminal --------
    console.log("���� [CLOUD] Looking up active terminal");

    const terminal = await getActiveTerminalForStore(store_id);

    if (!terminal) {
      console.error("❌ [CLOUD] No active terminal found", { store_id });
      return res.status(404).json({
        success: false,
        message: "No active terminal"
      });
    }

    const { terminal_uid, hardware_url, agent_secret } = terminal;

    console.log("✅ [CLOUD] Active terminal resolved", {
      terminal_uid,
      hardware_url
    });

    // -------- Step 3: Build target URL --------
    const targetUrl = `${hardware_url}/api/printer/list`;
    console.log("���� [CLOUD] Forwarding request to hardware", targetUrl);

    // -------- Step 4: Forward request --------
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
    } catch (netErr) {
      console.error("����❌ [CLOUD] Hardware unreachable", {
        targetUrl,
        error: netErr.message
      });

      return res.status(502).json({
        success: false,
        message: "Hardware agent unreachable",
        error: netErr.message
      });
    }

    console.log("���� [CLOUD] Hardware response status", hardwareRes.status);

    // -------- Step 5: Parse response --------
    let data;
    try {
      data = await hardwareRes.json();
    } catch (parseErr) {
      console.error("����❌ [CLOUD] Invalid JSON from hardware", {
        error: parseErr.message
      });

      return res.status(502).json({
        success: false,
        message: "Invalid response from hardware"
      });
    }

    console.log("✅ [CLOUD] Printer list fetched successfully");

    // -------- Step 6: Relay response --------
    return res.status(hardwareRes.status).json(data);

  } catch (err) {
    console.error("���� [CLOUD] Unhandled exception", {
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

/* ====================================================
   /api/cloud/printer/list and /api/cloudprinter/list
==================================================== */
router.get("/printer/list", handlePrinterList);
router.get("/list", handlePrinterList);

/* ----------------------------------------------------
   CLOUD → HARDWARE (printer print)
---------------------------------------------------- */
router.post("/printer/print", async (req, res) => {
  console.log("����️ [CLOUD] Printer print request received");

  try {
    const store_id = req.headers["x-store-id"];
    if (!store_id) {
      console.error("❌ [CLOUD] Missing x-store-id header");
      return res.status(400).json({
        success: false,
        message: "Missing x-store-id"
      });
    }

    console.log("���� [CLOUD] Resolving active terminal for store:", store_id);
    const terminal = await getActiveTerminalForStore(store_id);

    if (!terminal) {
      console.error("❌ [CLOUD] No active terminal found");
      return res.status(404).json({
        success: false,
        message: "No active terminal"
      });
    }

    const { terminal_uid, hardware_url, agent_secret } = terminal;
    const targetUrl = `${hardware_url}/api/printer/print`;

    logger.info("[CLOUD PRINTER] Forwarding print to hardware", { targetUrl, terminal_uid });
    const hardwareRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-terminal-id": terminal_uid,
        "x-agent-secret": agent_secret
      },
      body: JSON.stringify(req.body),
      timeout: 15_000
    });

    const data = await hardwareRes.json();

    logger.info("[CLOUD PRINTER] Hardware print response", { status: hardwareRes.status, success: data?.success });
    return res.status(hardwareRes.status).json(data);

  } catch (err) {
    console.error("���� [CLOUD] Print forwarding failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


export default router;
