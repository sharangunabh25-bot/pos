import fetch from "node-fetch";
import os from "os";
import { config } from "./config.js";

export async function heartbeat() {
  try {
    const res = await fetch(`${config.cloud_url}/api/cloud/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": config.agent_secret
      },
      body: JSON.stringify({
        terminal_uid: config.terminal_uid,
        store_id: config.store_id,
        ip: getLocalIP()
      })
    });

    await res.json();
  } catch (err) {
    console.error("Heartbeat failed:", err.message);
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}
