import { query } from "../db.js";

/**
 * Register / update heartbeat from hardware agent
 */
export async function registerHeartbeat({
  terminal_uid,
  store_id,
  hardware_url,
  agent_secret
}) {
  await query(
    `
    INSERT INTO active_terminals (
      store_id,
      terminal_uid,
      hardware_url,
      agent_secret,
      last_seen_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (store_id)
    DO UPDATE SET
      terminal_uid = EXCLUDED.terminal_uid,
      hardware_url = EXCLUDED.hardware_url,
      agent_secret = EXCLUDED.agent_secret,
      last_seen_at = NOW()
    `,
    [store_id, terminal_uid, hardware_url, agent_secret]
  );

  return true;
}

/**
 * Get active terminal for store (last 5 minutes)
 */
export async function getActiveTerminalForStore(store_id) {
  const { rows } = await query(
    `
    SELECT terminal_uid, hardware_url, agent_secret, last_seen_at
    FROM active_terminals
    WHERE store_id = $1
      AND last_seen_at > NOW() - INTERVAL '5 minutes'
    `,
    [store_id]
  );

  return rows[0] || null;
}
import express from "express";
import fetch from "node-fetch";
import {
  registerHeartbeat,
  getActiveTerminalForStore
} from "../utils/hardwareRegistry.js";

const router = express.Router();

/**
 * Hardware → Cloud heartbeat
 */
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
    res.status(500).json({ success: false });
  }
});

/**
 * Frontend → Cloud → Hardware (printer list)
 */
router.get("/printer/list", async (req, res) => {
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
    console.error("Cloud printer error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
