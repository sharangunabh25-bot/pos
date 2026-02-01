import fetch from "node-fetch";
import { config } from "./config.js";

export async function heartbeat() {
  try {
    if (!process.env.NGROK_URL) {
      throw new Error("NGROK_URL is not set");
    }

    console.log("���� Sending heartbeat to cloud");
    console.log("➡️ hardware_url:", process.env.NGROK_URL);

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
          hardware_url: process.env.NGROK_URL // ✅ ONLY THIS
        })
      }
    );

    const data = await res.json();
    console.log("✅ Heartbeat ACK:", data);

  } catch (err) {
    console.error("❌ Heartbeat failed:", err.message);
  }
}
