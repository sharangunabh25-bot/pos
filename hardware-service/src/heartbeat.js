// src/heartbeat.js
import fetch from "node-fetch";
import { config } from "./config.js";

export async function heartbeat() {
  try {
    console.log("❤️ [HEARTBEAT] Starting heartbeat");

    // 1. ENV CHECK
    console.log("���� [HEARTBEAT] ENV NGROK_URL:", process.env.NGROK_URL);
    console.log("���� [HEARTBEAT] cloud_url:", config.cloud_url);
    console.log("���� [HEARTBEAT] terminal_uid:", config.terminal_uid);
    console.log("���� [HEARTBEAT] store_id:", config.store_id);

    if (!process.env.NGROK_URL) {
      throw new Error("NGROK_URL is not set in hardware agent");
    }

    // 2. PAYLOAD PREVIEW
    const payload = {
      store_id: config.store_id,
      hardware_url: process.env.NGROK_URL
    };

    console.log("���� [HEARTBEAT] Payload:", payload);

    // 3. SEND HEARTBEAT
    const res = await fetch(
      `${config.cloud_url}/api/cloud/heartbeat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-terminal-id": config.terminal_uid,
          "x-agent-secret": config.agent_secret
        },
        body: JSON.stringify(payload)
      }
    );

    console.log("���� [HEARTBEAT] HTTP status:", res.status);

    const data = await res.json();
    console.log("✅ [HEARTBEAT] Cloud response:", data);

  } catch (err) {
    console.error("❌ [HEARTBEAT] Failed:", err);
  }
}
