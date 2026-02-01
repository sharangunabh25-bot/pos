// src/heartbeat.js
import fetch from "node-fetch";
import { config } from "./config.js";

const HEARTBEAT_INTERVAL = 10_000; // 10 seconds

export function startHeartbeat() {
  if (!process.env.NGROK_URL) {
    console.error("❌ NGROK_URL not set");
    return;
  }

  setInterval(async () => {
    try {
      console.log("���� Sending heartbeat to cloud...");

      const res = await fetch(
        `${config.cloud_url}/api/cloud/heartbeat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-terminal-id": config.terminal_uid,
            "x-agent-secret": config.agent_secret
          },
          body: JSON.stringify({
            store_id: config.store_id,
            hardware_url: process.env.NGROK_URL // ✅ CRITICAL
          })
        }
      );

      const data = await res.json();
      console.log("✅ Heartbeat ACK:", data);

    } catch (err) {
      console.error("❌ Heartbeat failed:", err.message);
    }
  }, HEARTBEAT_INTERVAL);
}
