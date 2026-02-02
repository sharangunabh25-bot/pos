import fetch from "node-fetch";
import fs from "fs";
import { config, CONFIG_PATH } from "./config.js";

export async function heartbeat() {
  try {
    if (!process.env.NGROK_URL) {
      throw new Error("NGROK_URL not set");
    }

    console.log("���� [HEARTBEAT] Sending heartbeat");
    console.log("[HEARTBEAT] NGROK:", process.env.NGROK_URL);

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
          hardware_url: process.env.NGROK_URL
        })
      }
    );

    const data = await res.json();
    console.log("[HEARTBEAT] Cloud response:", data);

    /* ----------------------------------------------------
       OPTION B – APPLY APPROVAL LOCALLY
    ---------------------------------------------------- */
    if (data.approved && data.store_id) {
      if (!config.approved) {
        console.log("���� [HEARTBEAT] Applying approval locally");

        config.approved = true;
        config.store_id = data.store_id;

        fs.writeFileSync(
          CONFIG_PATH,
          JSON.stringify(config, null, 2)
        );

        console.log("✅ [HEARTBEAT] Terminal unlocked");
      }
    }

  } catch (err) {
    console.error("❌ [HEARTBEAT] Failed:", err.message);
  }
}
