import axios from "axios";
import { config } from "./config.js";

export function startHeartbeat() {
  setInterval(async () => {
    try {
      await axios.post(
        `${config.cloud_url}/api/terminals/heartbeat`,
        { terminal_id: config.terminal_id },
        {
          headers: {
            "X-Agent-Secret": config.agent_secret
          }
        }
      );

      console.log("Heartbeat OK:", config.terminal_id);
    } catch (err) {
      console.warn("Heartbeat failed:", err.message);
    }
  }, 15000);
}
