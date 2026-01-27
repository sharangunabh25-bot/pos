import express from "express";
import fetch from "node-fetch";
import { getTerminalByStore } from "../hardwareRegistry.js";

const router = express.Router();

/**
 * Frontend → Cloud → Hardware
 */
router.get("/printer/list", async (req, res) => {
  try {
    const store_id = req.headers["x-store-id"];
    if (!store_id) {
      return res.status(400).json({ success: false, message: "Missing x-store-id" });
    }

    const terminal = getTerminalByStore(store_id);
    if (!terminal) {
      return res.status(404).json({ success: false, message: "No active terminal for store" });
    }

    const hwRes = await fetch(
      `http://${terminal.ip}:3001/api/printer/list`,
      {
        headers: {
          "x-terminal-id": terminal.terminal_uid,
          "x-agent-secret": terminal.agent_secret
        }
      }
    );

    const data = await hwRes.json();
    res.status(hwRes.status).json(data);

  } catch (err) {
    console.error("Cloud printer proxy failed:", err.message);
    res.status(500).json({ success: false, message: "Hardware unreachable" });
  }
});

export default router;
