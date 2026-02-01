import fetch from "node-fetch";
import { config } from "./config.js";

export async function heartbeat() {
  const traceId = `hb-${Date.now()}`;

  try {
    console.log("\n================ HEARTBEAT START ================");
    console.log("���� Trace ID:", traceId);

    // ---------- ENV CHECK ----------
    console.log("���� [ENV] Checking required environment variables");

    if (!process.env.NGROK_URL) {
      console.error("❌ [ENV] NGROK_URL is NOT set");
      throw new Error("NGROK_URL is not set");
    }

    console.log("✅ [ENV] NGROK_URL:", process.env.NGROK_URL);
    console.log("✅ [ENV] CLOUD_URL:", config.cloud_url);

    // ---------- CONFIG CHECK ----------
    console.log("���� [CONFIG] Verifying agent identity");

    if (!config.terminal_uid) {
      throw new Error("terminal_uid missing in config");
    }

    if (!config.agent_secret) {
      throw new Error("agent_secret missing in config");
    }

    if (!config.store_id) {
      throw new Error("store_id missing in config");
    }

    console.log("✅ [CONFIG] terminal_uid:", config.terminal_uid);
    console.log("✅ [CONFIG] store_id:", config.store_id);
    console.log("���� [CONFIG] agent_secret: PRESENT");

    // ---------- PAYLOAD ----------
    const payload = {
      store_id: config.store_id,
      hardware_url: process.env.NGROK_URL
    };

    console.log("���� [PAYLOAD] Heartbeat payload:");
    console.log(JSON.stringify(payload, null, 2));

    // ---------- REQUEST ----------
    const url = `${config.cloud_url}/api/cloud/heartbeat`;

    console.log("➡️ [REQUEST] POST", url);
    console.log("➡️ [REQUEST] Headers:", {
      "Content-Type": "application/json",
      "x-terminal-id": config.terminal_uid,
      "x-agent-secret": "PRESENT"
    });

    const start = Date.now();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-terminal-id": config.terminal_uid,
        "x-agent-secret": config.agent_secret
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - start;

    console.log(`⬅️ [RESPONSE] Status: ${res.status} (${duration}ms)`);

    // ---------- RESPONSE BODY ----------
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Failed to parse JSON response from cloud");
    }

    console.log("⬅️ [RESPONSE] Body:");
    console.log(JSON.stringify(data, null, 2));

    if (!res.ok) {
      throw new Error(`Cloud heartbeat rejected (${res.status})`);
    }

    console.log("✅ [HEARTBEAT] Successfully registered with cloud");
    console.log("================ HEARTBEAT END =================\n");

  } catch (err) {
    console.error("\n❌ HEARTBEAT FAILURE");
    console.error("���� Trace ID:", traceId);
    console.error("���� Error:", err.message);
    console.error("================================================\n");
  }
}
